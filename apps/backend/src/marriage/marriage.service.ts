import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/constants/audit-actions';
import {
  MarriageRequestStatus,
  MarriageClassification,
  DocumentType,
  DocumentStatus,
  DocumentVisibility,
  FileAccessAction,
} from '@prisma/client';
import type { CreateMarriageRequestDto } from './dto/create-marriage-request.dto';
import type { UpdatePastoralNotesDto } from './dto/update-pastoral-notes.dto';
import type { UpdateStatusDto } from './dto/update-status.dto';
import type { UpdateClassificationDto } from './dto/update-classification.dto';
import type { QueryMarriageRequestsDto } from './dto/query-marriage-requests.dto';
import type { RequestContext } from '../auth/auth.service';
import {
  ALLOWED_TRANSITIONS,
  STATUS_LABELS,
  CLASSIFICATION_ALLOWED_STATUSES,
} from './constants/status-transitions';
import { StorageService } from '../storage/storage.service';
import {
  PdfService,
  formatDateFr,
  formatDateTimeFr,
} from '../documents/pdf/pdf.service';

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface MarriageRequestResponse {
  /** Public code — the only identifier returned to API clients (MAR-YYYY-NNNNN). */
  requestCode: string;
  /** Public code of the requesting member (SHK-YYYY-NNNNN). */
  memberCode: string;
  spouseFullName: string | null;
  spousePhone: string | null;
  spouseEmail: string | null;
  intendedMarriageDate: string | null;
  status: string;
  classification: string | null;
  pastorNotes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // ── Pastoral questionnaire ────────────────────────────────────────────────
  hasSpokenToSpouse: boolean | null;
  hasSpokenToSpouseSince: string | null;
  hasContactWithSpouse: boolean | null;
  parentsAware: boolean | null;
  spouseParentsAware: boolean | null;
  parentsKnowSpouse: boolean | null;
  parentsApprove: boolean | null;
  familiesMet: boolean | null;
  familiesMetSince: string | null;
  hasKissed: boolean | null;
  hasPhysicalContact: boolean | null;
  hasBeenIntimate: boolean | null;
  intimacyCount: string | null;
}

export interface PaginatedMarriageRequests {
  data: MarriageRequestResponse[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Response shape for a generated PDF document. */
export interface GeneratedDocumentResponse {
  /** Public document code (DOC-YYYY-NNNNN). */
  documentCode: string;
  /** Short-lived signed URL for immediate download. */
  signedUrl: string;
  /** ISO 8601 timestamp when the signed URL expires. */
  signedUrlExpiresAt: string;
}

// ─── Internal record type (from Prisma join) ──────────────────────────────────

type MarriageRequestWithMember = {
  id: string;
  requestCode: string;
  memberId: string;
  member: { memberCode: string };
  spouseFullName: string | null;
  spousePhone: string | null;
  spouseEmail: string | null;
  intendedMarriageDate: Date | null;
  status: MarriageRequestStatus;
  classification: MarriageClassification | null;
  pastorNotes: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Pastoral questionnaire
  hasSpokenToSpouse: boolean | null;
  hasSpokenToSpouseSince: string | null;
  hasContactWithSpouse: boolean | null;
  parentsAware: boolean | null;
  spouseParentsAware: boolean | null;
  parentsKnowSpouse: boolean | null;
  parentsApprove: boolean | null;
  familiesMet: boolean | null;
  familiesMetSince: string | null;
  hasKissed: boolean | null;
  hasPhysicalContact: boolean | null;
  hasBeenIntimate: boolean | null;
  intimacyCount: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class MarriageService {
  private readonly logger = new Logger(MarriageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly pdf: PdfService,
  ) {}

  // ── Create (DRAFT) ─────────────────────────────────────────────────────────

  /**
   * Creates a new marriage request as DRAFT.
   *
   * The requesting memberId is automatically resolved from the authenticated
   * user's UserMemberLink — clients never send memberId directly.
   *
   * If the actor has no linked member record (e.g. an admin with no member
   * profile), a 400 is thrown. For MVP, requests are always self-created.
   *
   * @throws BadRequestException — if the actor has no linked member record.
   */
  async create(
    dto: CreateMarriageRequestDto,
    actorUserId: string,
    ctx?: RequestContext,
  ): Promise<MarriageRequestResponse> {
    // 1. Resolve the actor's linked member
    const link = await this.prisma.userMemberLink.findFirst({
      where: { userId: actorUserId },
      include: { member: { select: { id: true, memberCode: true } } },
    });

    if (!link) {
      throw new BadRequestException(
        'Aucun dossier de fidèle lié à votre compte. Veuillez contacter le secrétariat.',
      );
    }

    // 2. Generate unique requestCode (MAR-YYYY-NNNNN)
    const requestCode = await this.generateRequestCode();

    // 3. Persist the marriage request
    const request = await this.prisma.marriageRequest.create({
      data: {
        requestCode,
        memberId: link.member.id,
        spouseFullName: dto.spouseFullName ?? null,
        spousePhone: dto.spousePhone ?? null,
        spouseEmail: dto.spouseEmail ?? null,
        intendedMarriageDate: dto.intendedMarriageDate
          ? new Date(dto.intendedMarriageDate)
          : null,
        status: MarriageRequestStatus.DRAFT,
        // Pastoral questionnaire
        hasSpokenToSpouse: dto.hasSpokenToSpouse ?? null,
        hasSpokenToSpouseSince: dto.hasSpokenToSpouseSince ?? null,
        hasContactWithSpouse: dto.hasContactWithSpouse ?? null,
        parentsAware: dto.parentsAware ?? null,
        spouseParentsAware: dto.spouseParentsAware ?? null,
        parentsKnowSpouse: dto.parentsKnowSpouse ?? null,
        parentsApprove: dto.parentsApprove ?? null,
        familiesMet: dto.familiesMet ?? null,
        familiesMetSince: dto.familiesMetSince ?? null,
        hasKissed: dto.hasKissed ?? null,
        hasPhysicalContact: dto.hasPhysicalContact ?? null,
        hasBeenIntimate: dto.hasBeenIntimate ?? null,
        intimacyCount: dto.intimacyCount ?? null,
      },
      include: { member: { select: { memberCode: true } } },
    });

    this.logger.log(
      `[MarriageService] Dossier matrimonial créé: ${requestCode} pour le fidèle ${link.member.memberCode}`,
    );

    return this.toResponse(request);
  }

  // ── Submit (DRAFT → SUBMITTED) ─────────────────────────────────────────────

  /**
   * Submits a marriage request for pastoral review (DRAFT → SUBMITTED).
   *
   * Validates:
   *   1. The request exists and is in DRAFT status.
   *   2. The requesting member owns this request (MEMBER role ownership check).
   *   3. All required fields are present before submission:
   *      - spouseFullName
   *      - at least one contact (spousePhone or spouseEmail)
   *
   * @throws NotFoundException   — request not found.
   * @throws ForbiddenException  — MEMBER trying to submit another member's request.
   * @throws BadRequestException — request is not in DRAFT status, or required fields missing.
   */
  async submit(
    requestCode: string,
    actorUserId: string,
    actorRole: string,
    ctx?: RequestContext,
  ): Promise<MarriageRequestResponse> {
    // 1. Load the request
    const existing = await this.findRequestOrThrow(requestCode);

    // 2. MEMBER role: enforce ownership (the actor must own this request)
    if (actorRole === 'MEMBER') {
      await this.enforceOwnership(actorUserId, existing.memberId, requestCode);
    }

    // 3. Must be DRAFT
    if (existing.status !== MarriageRequestStatus.DRAFT) {
      throw new BadRequestException(
        `Ce dossier ne peut pas être soumis car son statut actuel est "${STATUS_LABELS[existing.status]}". ` +
          `Seuls les dossiers au statut "Brouillon" peuvent être soumis.`,
      );
    }

    // 4. Validate required fields for submission
    if (!existing.spouseFullName || existing.spouseFullName.trim() === '') {
      throw new BadRequestException(
        'Le nom complet du/de la conjoint(e) est obligatoire avant de pouvoir soumettre le dossier.',
      );
    }

    if (!existing.spousePhone && !existing.spouseEmail) {
      throw new BadRequestException(
        'Au moins une coordonnée du/de la conjoint(e) (téléphone ou e-mail) est obligatoire avant de soumettre le dossier.',
      );
    }

    // 5. Validate pastoral questionnaire is fully answered
    const missingBooleans: string[] = [];
    if (existing.hasSpokenToSpouse === null)
      missingBooleans.push('Question 3 (avez-vous parlé de votre intention ?)');
    if (existing.hasContactWithSpouse === null)
      missingBooleans.push('Question 5 (avez-vous des contacts avec elle ?)');
    if (existing.parentsAware === null)
      missingBooleans.push('Question 6 (vos parents sont-ils au courant ?)');
    if (existing.spouseParentsAware === null)
      missingBooleans.push(
        'Question 7 (les parents de la fille sont-ils au courant ?)',
      );
    if (existing.parentsKnowSpouse === null)
      missingBooleans.push(
        'Question 8 (vos parents connaissent-ils la fille ?)',
      );
    if (existing.familiesMet === null)
      missingBooleans.push(
        'Question 10 (les deux familles se sont-elles rencontrées ?)',
      );
    if (existing.hasKissed === null)
      missingBooleans.push('Question 11a (vous êtes-vous embrassés ?)');
    if (existing.hasPhysicalContact === null)
      missingBooleans.push(
        'Question 11b (vous êtes-vous touchés dans le corps ?)',
      );
    if (existing.hasBeenIntimate === null)
      missingBooleans.push('Question 11c (vous êtes-vous connus ?)');

    // Conditional: Q9 only required if Q8 = true
    if (
      existing.parentsKnowSpouse === true &&
      existing.parentsApprove === null
    ) {
      missingBooleans.push("Question 9 (vos parents sont-ils d'accord ?)");
    }

    if (missingBooleans.length > 0) {
      throw new BadRequestException(
        `Le questionnaire pastoral est incomplet. Veuillez répondre aux questions suivantes avant de soumettre le dossier : ${missingBooleans.join(', ')}.`,
      );
    }

    // Conditional text fields
    if (
      existing.hasSpokenToSpouse === true &&
      (!existing.hasSpokenToSpouseSince ||
        existing.hasSpokenToSpouseSince.trim() === '')
    ) {
      throw new BadRequestException(
        'Veuillez préciser depuis quand vous avez parlé de votre intention à la fiancée (question 4).',
      );
    }
    if (
      existing.familiesMet === true &&
      (!existing.familiesMetSince || existing.familiesMetSince.trim() === '')
    ) {
      throw new BadRequestException(
        'Veuillez préciser depuis quand les deux familles se sont rencontrées (question 10b).',
      );
    }

    // 5. Transition to SUBMITTED
    const updated = await this.prisma.marriageRequest.update({
      where: { requestCode },
      data: {
        status: MarriageRequestStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: { member: { select: { memberCode: true } } },
    });

    // 6. Audit — fire-and-forget
    this.audit.log({
      actorUserId,
      action: AuditAction.MARRIAGE.SUBMITTED,
      entityType: 'MarriageRequest',
      entityId: requestCode,
      metadata: {
        requestCode,
        memberCode: updated.member.memberCode,
        previousStatus: MarriageRequestStatus.DRAFT,
        newStatus: MarriageRequestStatus.SUBMITTED,
      },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    this.logger.log(
      `[MarriageService] Dossier ${requestCode} soumis par l'utilisateur ${actorUserId}`,
    );

    return this.toResponse(updated);
  }

  // ── List ───────────────────────────────────────────────────────────────────

  /**
   * Returns a paginated list of marriage requests.
   *
   * Scoping rules:
   *   - MEMBER role: only sees their own requests (resolved via UserMemberLink).
   *   - All other roles with marriage.review or above: see all requests.
   *
   * @throws BadRequestException — if a MEMBER has no linked member record.
   */
  async findAll(
    query: QueryMarriageRequestsDto,
    actorUserId: string,
    actorRole: string,
  ): Promise<PaginatedMarriageRequests> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build WHERE clause
    const where: Record<string, unknown> = {};

    if (query.status) {
      where['status'] = query.status;
    }

    // MEMBER role: scope to their own member record
    if (actorRole === 'MEMBER') {
      const link = await this.prisma.userMemberLink.findFirst({
        where: { userId: actorUserId },
        select: { memberId: true },
      });

      if (!link) {
        // No linked member — return empty result (no error, just empty)
        return { data: [], total: 0, page, limit, pages: 0 };
      }

      where['memberId'] = link.memberId;
    }

    const [requests, total] = await Promise.all([
      this.prisma.marriageRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { member: { select: { memberCode: true } } },
      }),
      this.prisma.marriageRequest.count({ where }),
    ]);

    return {
      data: requests.map((r) => this.toResponse(r)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // ── Find one ───────────────────────────────────────────────────────────────

  /**
   * Returns the detail of a single marriage request by its public code.
   *
   * Authorization:
   *   - MEMBER role: can only view their own requests.
   *   - Other roles: can view any request.
   *
   * @throws NotFoundException   — request not found.
   * @throws ForbiddenException  — MEMBER trying to access another member's request.
   */
  async findByCode(
    requestCode: string,
    actorUserId: string,
    actorRole: string,
  ): Promise<MarriageRequestResponse> {
    const request = await this.findRequestOrThrow(requestCode);

    if (actorRole === 'MEMBER') {
      await this.enforceOwnership(actorUserId, request.memberId, requestCode);
    }

    return this.toResponse(request);
  }

  // ── Update pastoral notes ─────────────────────────────────────────────────

  /**
   * Updates the pastoral notes on a marriage request.
   *
   * Requires marriage.review permission.
   * Notes can be updated regardless of the current status (except COMPLETED).
   *
   * @throws NotFoundException — request not found.
   */
  async updatePastoralNotes(
    requestCode: string,
    dto: UpdatePastoralNotesDto,
    actorUserId: string,
    ctx?: RequestContext,
  ): Promise<MarriageRequestResponse> {
    // Verify the request exists
    await this.findRequestOrThrow(requestCode);

    const updated = await this.prisma.marriageRequest.update({
      where: { requestCode },
      data: {
        pastorNotes: dto.pastorNotes ?? null,
        reviewedAt: new Date(),
      },
      include: { member: { select: { memberCode: true } } },
    });

    this.logger.log(
      `[MarriageService] Notes pastorales mises à jour pour le dossier ${requestCode} par ${actorUserId}`,
    );

    return this.toResponse(updated);
  }

  // ── Update status ──────────────────────────────────────────────────────────

  /**
   * Changes the workflow status of a marriage request.
   *
   * Validates the transition against ALLOWED_TRANSITIONS.
   * Throws BadRequestException with a French message on invalid transitions.
   * Fires MARRIAGE.REVIEWED audit event.
   *
   * Requires marriage.review permission.
   *
   * @throws NotFoundException   — request not found.
   * @throws BadRequestException — transition not allowed.
   */
  async updateStatus(
    requestCode: string,
    dto: UpdateStatusDto,
    actorUserId: string,
    ctx?: RequestContext,
  ): Promise<MarriageRequestResponse> {
    // 1. Load the request
    const existing = await this.findRequestOrThrow(requestCode);

    // 2. Validate the transition
    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(dto.status)) {
      const allowedLabels = allowed
        .map((s) => `"${STATUS_LABELS[s]}"`)
        .join(', ');

      throw new BadRequestException(
        `Transition de statut invalide: "${STATUS_LABELS[existing.status]}" → "${STATUS_LABELS[dto.status]}". ` +
          (allowed.length > 0
            ? `Les transitions autorisées depuis ce statut sont: ${allowedLabels}.`
            : `Ce statut est terminal — aucune transition n'est possible.`),
      );
    }

    // 3. Apply the transition
    const updated = await this.prisma.marriageRequest.update({
      where: { requestCode },
      data: {
        status: dto.status,
        reviewedAt: new Date(),
      },
      include: { member: { select: { memberCode: true } } },
    });

    // 4. Audit — fire-and-forget
    this.audit.log({
      actorUserId,
      action: AuditAction.MARRIAGE.REVIEWED,
      entityType: 'MarriageRequest',
      entityId: requestCode,
      metadata: {
        requestCode,
        memberCode: updated.member.memberCode,
        previousStatus: existing.status,
        newStatus: dto.status,
        action: 'status_change',
      },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    this.logger.log(
      `[MarriageService] Statut du dossier ${requestCode} changé: ${existing.status} → ${dto.status} par ${actorUserId}`,
    );

    return this.toResponse(updated);
  }

  // ── Update classification ──────────────────────────────────────────────────

  /**
   * Sets the pastoral classification of a marriage request (GREEN / ORANGE / RED).
   *
   * Classification is only allowed when the status is UNDER_REVIEW or later.
   * Fires MARRIAGE.CLASSIFIED audit event.
   *
   * Requires marriage.classify permission (PASTOR and SUPER_ADMIN only).
   *
   * @throws NotFoundException   — request not found.
   * @throws BadRequestException — status does not allow classification.
   */
  async updateClassification(
    requestCode: string,
    dto: UpdateClassificationDto,
    actorUserId: string,
    ctx?: RequestContext,
  ): Promise<MarriageRequestResponse> {
    // 1. Load the request
    const existing = await this.findRequestOrThrow(requestCode);

    // 2. Validate status allows classification
    if (!CLASSIFICATION_ALLOWED_STATUSES.has(existing.status)) {
      throw new BadRequestException(
        `La classification n'est pas autorisée pour un dossier au statut "${STATUS_LABELS[existing.status]}". ` +
          `La classification ne peut être définie qu'à partir du statut "En cours d'examen".`,
      );
    }

    // 3. Apply the classification
    const updated = await this.prisma.marriageRequest.update({
      where: { requestCode },
      data: {
        classification: dto.classification,
        reviewedAt: new Date(),
      },
      include: { member: { select: { memberCode: true } } },
    });

    // 4. Audit — fire-and-forget
    this.audit.log({
      actorUserId,
      action: AuditAction.MARRIAGE.CLASSIFIED,
      entityType: 'MarriageRequest',
      entityId: requestCode,
      metadata: {
        requestCode,
        memberCode: updated.member.memberCode,
        previousClassification: existing.classification,
        newClassification: dto.classification,
      },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    this.logger.log(
      `[MarriageService] Dossier ${requestCode} classifié ${dto.classification} par ${actorUserId}`,
    );

    return this.toResponse(updated);
  }

  // ── PDF generation: marriage request ──────────────────────────────────────

  /**
   * Generates and uploads the marriage request summary PDF.
   *
   * Flow:
   *   1. Load the marriage request with full member + community data.
   *   2. Generate a PDF buffer via PdfService.
   *   3. Upload the buffer to R2 in folder "marriage/requests/".
   *   4. Generate a unique documentCode (DOC-YYYY-NNNNN).
   *   5. Create a Document record linked to this marriage request.
   *   6. Log GENERATE action in FileAccessLog.
   *   7. Audit DOCUMENT.GENERATED (fire-and-forget).
   *   8. Generate and return a signed URL for immediate download.
   *
   * Requires: document.generate permission (enforced at controller level).
   *
   * @throws NotFoundException — request not found.
   */
  async generateMarriageRequestPdf(
    requestCode: string,
    actorUserId: string,
    ctx?: RequestContext,
  ): Promise<GeneratedDocumentResponse> {
    // 1. Load request with full member details
    const request = await this.findRequestWithMemberDetails(requestCode);

    // 2. Build PDF data and generate buffer
    const pdfBuffer = await this.pdf.generateMarriageRequestPdf({
      requestCode: request.requestCode,
      memberName: `${request.member.firstName} ${request.member.lastName}`,
      memberCode: request.member.memberCode,
      communityName: request.member.community?.name ?? null,
      memberDateOfBirth: formatDateFr(request.member.dateOfBirth),
      spouseFullName: request.spouseFullName,
      spousePhone: request.spousePhone,
      spouseEmail: request.spouseEmail,
      intendedMarriageDate: formatDateFr(request.intendedMarriageDate),
      submittedAt: formatDateFr(request.submittedAt),
      generatedAt: formatDateTimeFr(new Date()),
      // Pastoral questionnaire
      hasSpokenToSpouse: request.hasSpokenToSpouse,
      hasSpokenToSpouseSince: request.hasSpokenToSpouseSince,
      hasContactWithSpouse: request.hasContactWithSpouse,
      parentsAware: request.parentsAware,
      spouseParentsAware: request.spouseParentsAware,
      parentsKnowSpouse: request.parentsKnowSpouse,
      parentsApprove: request.parentsApprove,
      familiesMet: request.familiesMet,
      familiesMetSince: request.familiesMetSince,
      hasKissed: request.hasKissed,
      hasPhysicalContact: request.hasPhysicalContact,
      hasBeenIntimate: request.hasBeenIntimate,
      intimacyCount: request.intimacyCount,
    });

    // 3. Upload to R2
    const originalFileName = `dossier-matrimonial-${requestCode}.pdf`;
    const uploadResult = await this.storage.upload({
      buffer: pdfBuffer,
      folder: 'marriage/requests',
      mimeType: 'application/pdf',
      originalFileName,
      uploadedByUserId: actorUserId,
    });

    // 4. Generate document code
    const documentCode = await this.generateDocumentCode();

    // 5. Extract stored file name from the R2 key
    const keyParts = uploadResult.r2ObjectKey.split('/');
    const storedFileName = keyParts[keyParts.length - 1] ?? randomUUID();

    // 6. Create Document record
    const document = await this.prisma.document.create({
      data: {
        documentCode,
        ownerType: 'MarriageRequest',
        ownerId: request.id,
        documentType: DocumentType.MARRIAGE_REQUEST_PDF,
        visibility: DocumentVisibility.PRIVATE,
        status: DocumentStatus.ACTIVE,
        originalFileName,
        storedFileName,
        r2Bucket: uploadResult.bucket,
        r2ObjectKey: uploadResult.r2ObjectKey,
        mimeType: 'application/pdf',
        fileSize: uploadResult.fileSize,
        checksum: uploadResult.checksum,
        generatedByUserId: actorUserId,
        uploadedByUserId: null,
      },
    });

    // 7. Log FileAccessLog (GENERATE action — never throws)
    await this.logFileAccess({
      documentId: document.id,
      actorUserId,
      action: FileAccessAction.GENERATE,
      ctx,
      metadata: {
        documentCode,
        documentType: DocumentType.MARRIAGE_REQUEST_PDF,
        requestCode,
      },
    });

    // 8. Audit event (fire-and-forget)
    this.audit.log({
      actorUserId,
      action: AuditAction.DOCUMENT.GENERATED,
      entityType: 'Document',
      entityId: documentCode,
      metadata: {
        documentType: DocumentType.MARRIAGE_REQUEST_PDF,
        requestCode,
        memberCode: request.member.memberCode,
      },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    // 9. Generate signed URL for immediate download (300 s default)
    const signedUrl = await this.storage.getSignedUrl(
      uploadResult.r2ObjectKey,
      300,
    );
    const signedUrlExpiresAt = new Date(Date.now() + 300 * 1000).toISOString();

    this.logger.log(
      `[MarriageService] PDF dossier matrimonial généré: ${documentCode} pour ${requestCode}`,
    );

    return { documentCode, signedUrl, signedUrlExpiresAt };
  }

  // ── PDF generation: medical referral ──────────────────────────────────────

  /**
   * Generates and uploads the medical referral letter PDF.
   *
   * Precondition: classification must be GREEN.
   * Throws BadRequestException with a French message if not.
   *
   * Flow mirrors generateMarriageRequestPdf but:
   *   - Validates classification === GREEN before proceeding.
   *   - Uses documentType: MEDICAL_REFERRAL_PDF.
   *   - Uploads to R2 in folder "marriage/referrals/".
   *
   * Requires: document.generate permission (enforced at controller level).
   *
   * @throws NotFoundException   — request not found.
   * @throws BadRequestException — classification is not GREEN.
   */
  async generateMedicalReferralPdf(
    requestCode: string,
    actorUserId: string,
    ctx?: RequestContext,
  ): Promise<GeneratedDocumentResponse> {
    // 1. Load request with full member details
    const request = await this.findRequestWithMemberDetails(requestCode);

    // 2. Validate classification
    if (request.classification !== MarriageClassification.GREEN) {
      const classLabel = request.classification
        ? `"${request.classification}"`
        : 'non définie';
      throw new BadRequestException(
        `La lettre de référence médicale ne peut être générée que pour un dossier classifié "VERT". ` +
          `La classification actuelle de ce dossier est ${classLabel}.`,
      );
    }

    // 3. Build PDF data and generate buffer
    const pdfBuffer = await this.pdf.generateMedicalReferralPdf({
      requestCode: request.requestCode,
      memberName: `${request.member.firstName} ${request.member.lastName}`,
      memberCode: request.member.memberCode,
      spouseFullName: request.spouseFullName,
      generatedAt: formatDateTimeFr(new Date()),
    });

    // 4. Upload to R2
    const originalFileName = `reference-medicale-${requestCode}.pdf`;
    const uploadResult = await this.storage.upload({
      buffer: pdfBuffer,
      folder: 'marriage/referrals',
      mimeType: 'application/pdf',
      originalFileName,
      uploadedByUserId: actorUserId,
    });

    // 5. Generate document code
    const documentCode = await this.generateDocumentCode();

    // 6. Extract stored file name from R2 key
    const keyParts = uploadResult.r2ObjectKey.split('/');
    const storedFileName = keyParts[keyParts.length - 1] ?? randomUUID();

    // 7. Create Document record
    const document = await this.prisma.document.create({
      data: {
        documentCode,
        ownerType: 'MarriageRequest',
        ownerId: request.id,
        documentType: DocumentType.MEDICAL_REFERRAL_PDF,
        visibility: DocumentVisibility.PRIVATE,
        status: DocumentStatus.ACTIVE,
        originalFileName,
        storedFileName,
        r2Bucket: uploadResult.bucket,
        r2ObjectKey: uploadResult.r2ObjectKey,
        mimeType: 'application/pdf',
        fileSize: uploadResult.fileSize,
        checksum: uploadResult.checksum,
        generatedByUserId: actorUserId,
        uploadedByUserId: null,
      },
    });

    // 8. Log FileAccessLog
    await this.logFileAccess({
      documentId: document.id,
      actorUserId,
      action: FileAccessAction.GENERATE,
      ctx,
      metadata: {
        documentCode,
        documentType: DocumentType.MEDICAL_REFERRAL_PDF,
        requestCode,
      },
    });

    // 9. Audit event (fire-and-forget)
    this.audit.log({
      actorUserId,
      action: AuditAction.DOCUMENT.GENERATED,
      entityType: 'Document',
      entityId: documentCode,
      metadata: {
        documentType: DocumentType.MEDICAL_REFERRAL_PDF,
        requestCode,
        memberCode: request.member.memberCode,
        classification: request.classification,
      },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    // 10. Signed URL for immediate download
    const signedUrl = await this.storage.getSignedUrl(
      uploadResult.r2ObjectKey,
      300,
    );
    const signedUrlExpiresAt = new Date(Date.now() + 300 * 1000).toISOString();

    this.logger.log(
      `[MarriageService] PDF référence médicale généré: ${documentCode} pour ${requestCode} (GREEN)`,
    );

    return { documentCode, signedUrl, signedUrlExpiresAt };
  }

  // ── Request code generation ────────────────────────────────────────────────

  /**
   * Generates a unique requestCode: MAR-YYYY-NNNNN.
   *
   * Strategy mirrors the member/document code generation pattern:
   *   1. Find the highest existing sequence for the current year.
   *   2. Increment by 1 and format as a zero-padded 5-digit number.
   *   3. Retry up to 3 times on race collision; UUID-based fallback on failure.
   */
  private async generateRequestCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `MAR-${year}-`;

    for (let attempt = 0; attempt < 3; attempt++) {
      const last = await this.prisma.marriageRequest.findFirst({
        where: { requestCode: { startsWith: prefix } },
        orderBy: { requestCode: 'desc' },
        select: { requestCode: true },
      });

      let nextSeq = 1;
      if (last) {
        const parts = last.requestCode.split('-');
        const lastSeq = parseInt(parts[2] ?? '0', 10);
        nextSeq = isNaN(lastSeq) ? 1 : lastSeq + 1;
      }

      const candidate = `${prefix}${String(nextSeq).padStart(5, '0')}`;

      const collision = await this.prisma.marriageRequest.findUnique({
        where: { requestCode: candidate },
        select: { requestCode: true },
      });

      if (!collision) return candidate;

      this.logger.warn(
        `[MarriageService] Collision détectée pour le code ${candidate}, nouvel essai ${attempt + 1}/3`,
      );
    }

    // Extremely unlikely fallback — use timestamp suffix
    const fallback = `${prefix}${Date.now()}`;
    this.logger.error(
      `[MarriageService] Impossible de générer un code unique après 3 tentatives — fallback: ${fallback}`,
    );
    return fallback;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Loads a marriage request by its public requestCode (with the linked member's
   * memberCode included). Throws NotFoundException if not found.
   */
  private async findRequestOrThrow(
    requestCode: string,
  ): Promise<MarriageRequestWithMember> {
    const request = await this.prisma.marriageRequest.findUnique({
      where: { requestCode },
      include: { member: { select: { memberCode: true } } },
    });

    if (!request) {
      throw new NotFoundException(
        `Aucun dossier matrimonial trouvé avec le code ${requestCode}.`,
      );
    }

    return request;
  }

  /**
   * Enforces that the authenticated user (MEMBER role) owns the marriage request.
   * Resolves ownership via UserMemberLink: the actor's linked memberId must match
   * the request's memberId.
   *
   * @throws ForbiddenException — if the actor does not own this request.
   */
  private async enforceOwnership(
    actorUserId: string,
    requestMemberId: string,
    requestCode: string,
  ): Promise<void> {
    const link = await this.prisma.userMemberLink.findFirst({
      where: { userId: actorUserId, memberId: requestMemberId },
      select: { id: true },
    });

    if (!link) {
      throw new ForbiddenException(
        `Vous n'êtes pas autorisé à accéder au dossier matrimonial ${requestCode}.`,
      );
    }
  }

  /**
   * Maps a Prisma MarriageRequest record (with joined member) to a safe API
   * response shape. Never exposes internal `id` or `memberId`.
   */
  private toResponse(
    request: MarriageRequestWithMember,
  ): MarriageRequestResponse {
    return {
      requestCode: request.requestCode,
      memberCode: request.member.memberCode,
      spouseFullName: request.spouseFullName,
      spousePhone: request.spousePhone,
      spouseEmail: request.spouseEmail,
      intendedMarriageDate: request.intendedMarriageDate?.toISOString() ?? null,
      status: request.status,
      classification: request.classification,
      pastorNotes: request.pastorNotes,
      submittedAt: request.submittedAt?.toISOString() ?? null,
      reviewedAt: request.reviewedAt?.toISOString() ?? null,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      // Pastoral questionnaire
      hasSpokenToSpouse: request.hasSpokenToSpouse,
      hasSpokenToSpouseSince: request.hasSpokenToSpouseSince,
      hasContactWithSpouse: request.hasContactWithSpouse,
      parentsAware: request.parentsAware,
      spouseParentsAware: request.spouseParentsAware,
      parentsKnowSpouse: request.parentsKnowSpouse,
      parentsApprove: request.parentsApprove,
      familiesMet: request.familiesMet,
      familiesMetSince: request.familiesMetSince,
      hasKissed: request.hasKissed,
      hasPhysicalContact: request.hasPhysicalContact,
      hasBeenIntimate: request.hasBeenIntimate,
      intimacyCount: request.intimacyCount,
    };
  }

  /**
   * Loads a marriage request with full member + community details needed for
   * PDF generation. Throws NotFoundException if not found.
   */
  private async findRequestWithMemberDetails(requestCode: string) {
    const request = await this.prisma.marriageRequest.findUnique({
      where: { requestCode },
      include: {
        member: {
          select: {
            id: true,
            memberCode: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            community: { select: { name: true } },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(
        `Aucun dossier matrimonial trouvé avec le code ${requestCode}.`,
      );
    }

    return request;
  }

  /**
   * Generates a unique document code: DOC-YYYY-NNNNN.
   *
   * Same strategy as DocumentsService.generateDocumentCode() — find highest
   * sequence for the current year, increment, retry on collision.
   */
  private async generateDocumentCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DOC-${year}-`;

    for (let attempt = 0; attempt < 3; attempt++) {
      const last = await this.prisma.document.findFirst({
        where: { documentCode: { startsWith: prefix } },
        orderBy: { documentCode: 'desc' },
        select: { documentCode: true },
      });

      let nextSeq = 1;
      if (last) {
        const parts = last.documentCode.split('-');
        const lastSeq = parseInt(parts[2] ?? '0', 10);
        nextSeq = isNaN(lastSeq) ? 1 : lastSeq + 1;
      }

      const code = `${prefix}${String(nextSeq).padStart(5, '0')}`;

      const exists = await this.prisma.document.findUnique({
        where: { documentCode: code },
      });
      if (!exists) return code;

      this.logger.warn(
        `[MarriageService] Collision sur le code document ${code}, nouvel essai…`,
      );
    }

    // UUID-based fallback — virtually impossible to collide
    return `${prefix}${randomUUID().split('-')[0]}`;
  }

  /**
   * Writes a FileAccessLog entry for a document operation.
   * Never throws — access logging must not crash the main request.
   */
  private async logFileAccess(params: {
    documentId: string;
    actorUserId: string;
    action: FileAccessAction;
    ctx?: RequestContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeMetadata: any = params.metadata
        ? JSON.parse(JSON.stringify(params.metadata))
        : undefined;

      await this.prisma.fileAccessLog.create({
        data: {
          documentId: params.documentId,
          actorUserId: params.actorUserId,
          action: params.action,
          ipAddress: params.ctx?.ipAddress ?? null,
          userAgent: params.ctx?.userAgent ?? null,
          metadata: safeMetadata,
        },
      });
    } catch (err: unknown) {
      this.logger.error(
        `[MarriageService] Impossible d'enregistrer l'accès au fichier: ${String(err)}`,
      );
    }
  }
}
