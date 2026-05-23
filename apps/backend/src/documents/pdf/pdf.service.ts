import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

// ─── Data shapes for PDF generation ──────────────────────────────────────────

/**
 * Data required to generate a marriage request PDF.
 * All string fields are safe French text (no raw DB IDs).
 */
export interface MarriagePdfData {
  requestCode: string; // MAR-YYYY-NNNNN
  memberName: string; // firstName + lastName
  memberCode: string; // SHK-YYYY-NNNNN
  communityName: string | null;
  memberDateOfBirth: string | null; // formatted French date, e.g. "15 mars 1990"
  spouseFullName: string | null;
  spousePhone: string | null;
  spouseEmail: string | null;
  intendedMarriageDate: string | null; // formatted French date
  submittedAt: string | null; // formatted French date
  generatedAt: string; // formatted French date + time
}

/**
 * Data required to generate a medical referral PDF.
 */
export interface MedicalReferralPdfData {
  requestCode: string;
  memberName: string;
  memberCode: string;
  spouseFullName: string | null;
  generatedAt: string;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** French month names (0-indexed). */
const FRENCH_MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

/** Formats a Date or ISO string as a French date: "15 mars 1990". */
function formatDateFr(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return `${d.getDate()} ${FRENCH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Formats a Date or ISO string as a French date + time: "15 mars 1990 à 14:30". */
function formatDateTimeFr(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  const date = `${d.getDate()} ${FRENCH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${date} à ${time}`;
}

export { formatDateFr, formatDateTimeFr };

// ─── Layout constants ─────────────────────────────────────────────────────────

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4 width in pt
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Brand colours (used for header and section titles)
const COLOR_PRIMARY = '#1E3A5F'; // deep blue
const COLOR_ACCENT = '#2C7BE5'; // lighter blue for section lines
const COLOR_TEXT = '#1A1A1A';
const COLOR_MUTED = '#6B7280';

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PdfService — generates PDF buffers for church documents.
 *
 * This service is purely presentational: it accepts plain data objects and
 * returns a Buffer. No database access, no HTTP calls — fully testable.
 *
 * Callers are responsible for:
 *   - Fetching all required data (from DB)
 *   - Uploading the returned buffer to R2 via StorageService
 *   - Persisting the Document record and audit events
 *
 * All PDF content is in French.
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  // ── Marriage request PDF ───────────────────────────────────────────────────

  /**
   * Generates the marriage request summary PDF.
   *
   * Sections:
   *   - En-tête de l'église (church header)
   *   - Informations du demandeur
   *   - Informations sur le/la conjoint(e)
   *   - Projet matrimonial
   *   - Pied de page (footer with generation date)
   *
   * @returns A Buffer containing the complete PDF.
   */
  async generateMarriageRequestPdf(data: MarriagePdfData): Promise<Buffer> {
    this.logger.log(
      `[PdfService] Génération PDF dossier matrimonial: ${data.requestCode}`,
    );

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        info: {
          Title: `Dossier Matrimonial — ${data.requestCode}`,
          Author: 'Shiddukim — Plateforme Église',
          Subject: 'Demande de mariage',
          CreationDate: new Date(),
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ─────────────────────────────────────────────────────────────
      this.drawChurchHeader(doc, 'DOSSIER MATRIMONIAL');

      // ── Section: Informations du demandeur ─────────────────────────────────
      this.drawSectionTitle(doc, 'Informations du demandeur');
      this.drawField(doc, 'Nom complet', data.memberName);
      this.drawField(doc, 'Code fidèle', data.memberCode);
      this.drawField(doc, 'Communauté', data.communityName ?? '—');
      this.drawField(doc, 'Date de naissance', data.memberDateOfBirth ?? '—');

      doc.moveDown(0.5);

      // ── Section: Informations sur le/la conjoint(e) ───────────────────────
      this.drawSectionTitle(doc, 'Informations sur le/la conjoint(e)');
      this.drawField(doc, 'Nom complet', data.spouseFullName ?? '—');
      this.drawField(doc, 'Téléphone', data.spousePhone ?? '—');
      this.drawField(doc, 'Adresse e-mail', data.spouseEmail ?? '—');

      doc.moveDown(0.5);

      // ── Section: Projet matrimonial ────────────────────────────────────────
      this.drawSectionTitle(doc, 'Projet matrimonial');
      this.drawField(doc, 'Numéro du dossier', data.requestCode);
      this.drawField(
        doc,
        'Date souhaitée pour le mariage',
        data.intendedMarriageDate ?? '—',
      );
      this.drawField(
        doc,
        'Date de soumission du dossier',
        data.submittedAt ?? '—',
      );

      // ── Footer ─────────────────────────────────────────────────────────────
      this.drawFooter(doc, data.generatedAt);

      doc.end();
    });
  }

  // ── Medical referral PDF ───────────────────────────────────────────────────

  /**
   * Generates the medical referral letter PDF.
   *
   * Content:
   *   - En-tête de l'église
   *   - Titre: "Lettre de Référence Médicale"
   *   - Informations du couple (noms, code dossier)
   *   - Zone de signature du pasteur
   *   - Instructions médicales (placeholder)
   *   - Zone de cachet et date
   *
   * Only generated when classification === GREEN.
   *
   * @returns A Buffer containing the complete PDF.
   */
  async generateMedicalReferralPdf(
    data: MedicalReferralPdfData,
  ): Promise<Buffer> {
    this.logger.log(
      `[PdfService] Génération PDF référence médicale: ${data.requestCode}`,
    );

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        info: {
          Title: `Lettre de Référence Médicale — ${data.requestCode}`,
          Author: 'Shiddukim — Plateforme Église',
          Subject: 'Référence médicale pré-matrimoniale',
          CreationDate: new Date(),
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ─────────────────────────────────────────────────────────────
      this.drawChurchHeader(doc, 'LETTRE DE RÉFÉRENCE MÉDICALE');

      // ── Objet de la lettre ─────────────────────────────────────────────────
      doc
        .moveDown(0.5)
        .fontSize(11)
        .fillColor(COLOR_TEXT)
        .text(
          "La présente lettre atteste que les personnes mentionnées ci-dessous font l'objet d'un suivi " +
            'pastoral en vue de leur mariage au sein de notre église. À ce titre, elles sont invitées à ' +
            'se soumettre aux examens médicaux pré-matrimoniaux requis.',
          { align: 'justify' },
        )
        .moveDown();

      // ── Informations du couple ─────────────────────────────────────────────
      this.drawSectionTitle(doc, 'Informations du couple');
      this.drawField(doc, 'Demandeur', data.memberName);
      this.drawField(doc, 'Code du dossier', data.requestCode);
      this.drawField(doc, 'Conjoint(e)', data.spouseFullName ?? '—');

      doc.moveDown(0.5);

      // ── Instructions médicales ─────────────────────────────────────────────
      this.drawSectionTitle(doc, 'Instructions médicales');
      doc
        .fontSize(10)
        .fillColor(COLOR_TEXT)
        .text(
          'Les examens suivants sont recommandés dans le cadre du programme de préparation ' +
            'au mariage de notre église :',
          { align: 'justify' },
        )
        .moveDown(0.4);

      const instructions = [
        'Groupage sanguin et rhésus',
        'Dépistage VIH/SIDA',
        'Dépistage des hépatites B et C',
        'Sérologie syphilis (TPHA/VDRL)',
        "Drépanocytose (électrophorèse de l'hémoglobine)",
        'Tout autre examen jugé nécessaire par le médecin',
      ];

      instructions.forEach((item) => {
        doc
          .fontSize(10)
          .fillColor(COLOR_TEXT)
          .text(`• ${item}`, { indent: 15 });
      });

      doc.moveDown();

      // ── Zone de signature du pasteur ───────────────────────────────────────
      this.drawSectionTitle(doc, 'Signature du pasteur responsable');

      const signY = doc.y + 10;
      doc
        .fontSize(10)
        .fillColor(COLOR_MUTED)
        .text('Nom et signature :', MARGIN, signY)
        .moveDown(0.3);

      // Signature line
      doc
        .moveTo(MARGIN + 130, doc.y + 20)
        .lineTo(MARGIN + 350, doc.y + 20)
        .strokeColor(COLOR_MUTED)
        .lineWidth(0.5)
        .stroke()
        .moveDown(2);

      // ── Zone de cachet et date ─────────────────────────────────────────────
      const stampBoxY = doc.y;
      const stampBoxWidth = 180;
      const stampBoxHeight = 80;

      doc
        .rect(MARGIN, stampBoxY, stampBoxWidth, stampBoxHeight)
        .strokeColor(COLOR_MUTED)
        .lineWidth(0.5)
        .stroke();

      doc
        .fontSize(9)
        .fillColor(COLOR_MUTED)
        .text("Cachet de l'église", MARGIN + 10, stampBoxY + 10, {
          width: stampBoxWidth - 20,
          align: 'center',
        });

      // Date box on the right
      const dateBoxX = PAGE_WIDTH - MARGIN - stampBoxWidth;
      doc
        .rect(dateBoxX, stampBoxY, stampBoxWidth, stampBoxHeight)
        .strokeColor(COLOR_MUTED)
        .lineWidth(0.5)
        .stroke();

      doc
        .fontSize(9)
        .fillColor(COLOR_MUTED)
        .text('Date :', dateBoxX + 10, stampBoxY + 10)
        .moveDown(0.3)
        .text(data.generatedAt, dateBoxX + 10, stampBoxY + 30, {
          width: stampBoxWidth - 20,
          align: 'center',
        });

      // ── Footer ─────────────────────────────────────────────────────────────
      this.drawFooter(doc, data.generatedAt);

      doc.end();
    });
  }

  // ── Private drawing helpers ────────────────────────────────────────────────

  /**
   * Draws the church header at the top of the document.
   * Includes church name, subtitle, and a coloured horizontal rule.
   */
  private drawChurchHeader(doc: PDFKit.PDFDocument, subtitle: string): void {
    // Church name (large, primary colour)
    doc
      .fontSize(20)
      .fillColor(COLOR_PRIMARY)
      .font('Helvetica-Bold')
      .text('SHIDDUKIM', MARGIN, MARGIN, {
        width: CONTENT_WIDTH,
        align: 'center',
      });

    // Tagline
    doc
      .fontSize(10)
      .fillColor(COLOR_MUTED)
      .font('Helvetica')
      .text('Plateforme de gestion des fidèles et dossiers matrimoniaux', {
        width: CONTENT_WIDTH,
        align: 'center',
      })
      .moveDown(0.4);

    // Horizontal rule — primary colour
    const ruleY = doc.y;
    doc
      .moveTo(MARGIN, ruleY)
      .lineTo(PAGE_WIDTH - MARGIN, ruleY)
      .strokeColor(COLOR_PRIMARY)
      .lineWidth(2)
      .stroke()
      .moveDown(0.6);

    // Document subtitle (e.g. "DOSSIER MATRIMONIAL")
    doc
      .fontSize(14)
      .fillColor(COLOR_PRIMARY)
      .font('Helvetica-Bold')
      .text(subtitle, { width: CONTENT_WIDTH, align: 'center' })
      .moveDown(1)
      .font('Helvetica');
  }

  /**
   * Draws a section title with an accent underline.
   */
  private drawSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
    doc
      .fontSize(12)
      .fillColor(COLOR_PRIMARY)
      .font('Helvetica-Bold')
      .text(title)
      .moveDown(0.1);

    // Thin accent line below the title
    const y = doc.y;
    doc
      .moveTo(MARGIN, y)
      .lineTo(MARGIN + 200, y)
      .strokeColor(COLOR_ACCENT)
      .lineWidth(1)
      .stroke()
      .moveDown(0.5)
      .font('Helvetica');
  }

  /**
   * Draws a label–value field row.
   *
   * Label is rendered in muted grey; value in primary dark text.
   * Uses a two-column layout: label left, value right.
   */
  private drawField(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
  ): void {
    const labelWidth = 180;
    const valueX = MARGIN + labelWidth + 10;
    const valueWidth = CONTENT_WIDTH - labelWidth - 10;
    const currentY = doc.y;

    doc
      .fontSize(10)
      .fillColor(COLOR_MUTED)
      .font('Helvetica')
      .text(label + ' :', MARGIN, currentY, {
        width: labelWidth,
        continued: false,
      });

    doc
      .fontSize(10)
      .fillColor(COLOR_TEXT)
      .text(value, valueX, currentY, { width: valueWidth });

    doc.moveDown(0.3);
  }

  /**
   * Draws the footer with the document generation timestamp.
   * Positioned relative to current cursor position (not fixed to page bottom).
   */
  private drawFooter(doc: PDFKit.PDFDocument, generatedAt: string): void {
    doc.moveDown(2);

    const footerY = doc.y;

    // Thin separator line
    doc
      .moveTo(MARGIN, footerY)
      .lineTo(PAGE_WIDTH - MARGIN, footerY)
      .strokeColor(COLOR_MUTED)
      .lineWidth(0.5)
      .stroke()
      .moveDown(0.5);

    doc
      .fontSize(9)
      .fillColor(COLOR_MUTED)
      .font('Helvetica')
      .text(
        `Document généré le ${generatedAt} par le système Shiddukim. ` +
          'Ce document est confidentiel et réservé à un usage pastoral et médical.',
        { align: 'center' },
      );
  }
}
