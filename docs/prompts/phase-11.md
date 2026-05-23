# Phase 11 Prompt — Documents & PDF Generation

> Copy everything below the divider and paste it as your first message in a new conversation.

---

## Project

We are building **Shiddukim** — a church member management platform in French.
It handles member registration, marriage requests, pastoral review, appointments, and document generation.
The UI and all user-facing messages must be in French.

## Stack
- Backend: NestJS + TypeScript + Prisma + PostgreSQL + Redis
- Frontend: Next.js + TypeScript + Tailwind CSS + shadcn/ui
- Storage: Cloudflare R2 (private bucket, signed URLs only)
- Verification: Twilio Verify (email in MVP)
- Architecture: Modular monolith
- API: REST, base path `/api/v1`

## Key Rules (always apply)
- Never expose database IDs or R2 object keys in responses
- Generated PDFs are stored in R2 and accessed via signed URLs only
- Log every document generation in AuditLog with action `DOCUMENT.GENERATED`
- Log every file access in `FileAccessLog`
- The UI and PDF content must be in French

## Completed Phases

### Phase 1 — Infrastructure & Monorepo ✅
### Phase 2 — Authentication Foundation ✅
### Phase 3 — RBAC & Rate Limiting ✅
### Phase 4 — Audit Logging ✅
### Phase 5 — Verification Service (OTP) ✅
### Phase 6 — Member Registry ✅
### Phase 7 — File Storage (R2) ✅
- `StorageService.upload(...)` and `StorageService.getSignedUrl(...)`
- `Document` model with `documentCode` as public identifier
- `FileAccessLog` model
### Phase 8 — Member Photo Upload ✅
### Phase 9 — Member Activation ✅
### Phase 10 — Marriage Workflow ✅
- `MarriageRequest` model with `requestCode` as public identifier
- Status machine with validated transitions
- Classifications: GREEN, ORANGE, RED
- See `docs/PROGRESS.md` for actual file paths and all conventions

## Reference Docs to Read First
- `docs/09-development-plan.md` — Phase 11 sub-tasks
- `docs/05-data-model.md` — Document model
- `docs/08-api-contracts.md` — document endpoints
- `docs/PROGRESS.md` — all conventions so far (especially StorageService API from Phase 7)

## Current Phase: 11 — Documents & PDF Generation

**Deliverable:** The backend can generate a marriage request PDF and a medical referral PDF, store them in R2, and return a signed URL for immediate download.

### Sub-tasks
1. Choose and install a PDF library (prefer backend-side: `pdfkit` or `puppeteer`)
   - `pdfkit`: lightweight, pure Node, good for data-heavy docs without complex layouts
   - `puppeteer`: HTML-to-PDF, better for branded layouts — requires more setup
   - Record decision in `docs/PROGRESS.md`
2. Create `PdfService` with two methods:
   - `generateMarriageRequestPdf(requestCode): Promise<Buffer>`
   - `generateMedicalReferralPdf(requestCode): Promise<Buffer>`
3. Marriage request PDF content (in French):
   - Church header with name and logo reference
   - Section: Informations du demandeur (member name, code, community, date of birth)
   - Section: Informations sur le conjoint (spouse name, phone, email)
   - Section: Projet matrimonial (intended date, request code, submission date)
   - Footer with date of generation
4. Medical referral PDF content (in French):
   - Church header
   - Title: "Lettre de Référence Médicale"
   - Couple names, request code
   - Pastor name and signature area
   - Medical instructions placeholder
   - Date and church stamp area
5. `POST /marriage-requests/:requestCode/generate-pdf` — requires `document.generate`
   - Generate PDF buffer using `PdfService`
   - Upload to R2 in folder `marriage/requests/` using `StorageService.upload`
   - Create `Document` record: `documentType: MARRIAGE_REQUEST_PDF`, linked to marriage request
   - Audit `DOCUMENT.GENERATED`
   - Return signed URL for immediate download
6. `POST /marriage-requests/:requestCode/generate-medical-referral` — requires `document.generate`
   - Only allowed when `classification === GREEN`
   - Reject with French error if classification is not GREEN
   - Generate, upload to `marriage/referrals/`, create `Document` record
   - Audit `DOCUMENT.GENERATED`
   - Return signed URL
7. `GET /documents` — list documents for authenticated user (members see own; admins/pastors filtered by RBAC)
8. `GET /documents/:documentCode/url` — get fresh signed URL (validates ownership, logs `FILE.DOWNLOADED` in `FileAccessLog`)

## Git Workflow for This Phase
- Branch: `feature/phase-11-pdf` from `develop`
- Commit after: PDF library decision + PdfService, marriage request PDF, medical referral PDF, document listing
- Open a PR from `feature/phase-11-pdf` → `develop` when the deliverable is met

## Start With
Read `docs/PROGRESS.md` to understand the `StorageService` API, `Document` model, and `MarriageRequest` model from previous phases.
Decide on the PDF library first and record it in `docs/PROGRESS.md`.
Then build `PdfService`, then the generate endpoints.
At the end, merge the PR, then update `docs/PROGRESS.md` Phase 11 section with actual file paths created and the PDF library chosen.
