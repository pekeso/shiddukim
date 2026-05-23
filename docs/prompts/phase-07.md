# Phase 7 Prompt — File Storage (R2)

> Copy everything below the divider and paste it as your first message in a new conversation.

---

## Project

We are building **Shiddukim** — a church member management platform in French.
It handles member registration, marriage requests, pastoral review, appointments, and document generation.
The UI and all user-facing messages must be in French.

## Stack
- Backend: NestJS + TypeScript + Prisma + PostgreSQL + Redis
- Frontend: Next.js + TypeScript + Tailwind CSS + shadcn/ui
- Storage: Cloudflare R2 (private bucket, signed URLs only) — S3-compatible API
- Verification: Twilio Verify (email in MVP)
- Architecture: Modular monolith
- API: REST, base path `/api/v1`

## Key Rules (always apply)
- Never expose database IDs publicly
- R2 bucket is PRIVATE — no public access, no permanent public URLs
- Object keys must be UUID-based — never include names, phone numbers, or member codes in keys
- Generate short-lived signed URLs (default 300s) only after RBAC + ownership checks
- Log every file upload, download, view, and delete in `FileAccessLog`
- The UI must be in French

## Completed Phases

### Phase 1 — Infrastructure & Monorepo ✅
### Phase 2 — Authentication Foundation ✅
### Phase 3 — RBAC & Rate Limiting ✅
### Phase 4 — Audit Logging ✅
### Phase 5 — Verification Service (OTP) ✅
### Phase 6 — Member Registry ✅
- `Member`, `Community`, `UserMemberLink` Prisma models
- Member CRUD with `memberCode` as public identifier
- Member code format: `SHK-YYYY-NNNNN`
- QR code endpoint
- Duplicate detection
- See `docs/PROGRESS.md` for actual file paths and conventions

## Reference Docs to Read First
- `docs/09-development-plan.md` — Phase 7 sub-tasks
- `docs/11-storage-design.md` — full R2 storage design
- `docs/05-data-model.md` — Document and FileAccessLog models
- `docs/10-security-requirements.md` — file security rules
- `docs/PROGRESS.md` — all conventions so far

## Current Phase: 7 — File Storage (R2)

**Deliverable:** The backend can upload files to Cloudflare R2, generate signed URLs for authorized access, and track all file metadata and access events in PostgreSQL. No file is ever accessible without going through the backend.

### Sub-tasks
1. Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (R2 uses S3-compatible API)
2. Create `R2Client` configured with `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
3. Verify R2 connection on app startup (log warning if unreachable, don't crash)
4. Object key generation: `{domain}/{year}/{month}/{uuid}.{ext}` — e.g. `members/photos/2026/05/uuid.jpg`
5. Create `StorageService.upload({ buffer, folder, mimeType, originalFileName, uploadedByUserId })`
6. Validate MIME type against allowed list: `image/jpeg`, `image/png`, `application/pdf`
7. Validate file size against `MAX_FILE_SIZE_MB` env var
8. Compute SHA-256 checksum before upload
9. Upload using `PutObjectCommand`, return `{ r2ObjectKey, bucket, checksum, fileSize, mimeType }`
10. Add full `Document` model to Prisma (all fields from data model doc); add `documentCode` as public identifier
11. Add `DocumentType` enum: `MEMBER_PHOTO`, `MEMBER_CARD`, `MARRIAGE_REQUEST_PDF`, `MEDICAL_REFERRAL_PDF`, `SUPPORTING_DOCUMENT`
12. Add `DocumentStatus` and `DocumentVisibility` enums
13. Add `FileAccessLog` model: `id`, `documentId`, `actorUserId`, `action`, `ipAddress`, `userAgent`, `accessedAt`, `metadata`
14. Add `FileAccessAction` enum: `VIEW`, `DOWNLOAD`, `UPLOAD`, `DELETE`, `GENERATE`
15. Run migration
16. Create `StorageService.getSignedUrl(r2ObjectKey, expiresInSeconds)` using `GetObjectCommand` + presigner
17. `POST /documents/upload` — upload supporting document (requires auth + ownership check)
18. `GET /documents/:documentCode` — get document metadata (requires auth + RBAC)
19. `GET /documents/:documentCode/url` — get signed URL (requires auth + RBAC + ownership); log to `FileAccessLog`
20. Never return raw R2 object keys in any API response

## Git Workflow for This Phase
- Branch: `feature/phase-07-storage` from `develop`
- Commit after: R2 client, StorageService, Prisma models, document endpoints
- Open a PR from `feature/phase-07-storage` → `develop` when the deliverable is met

## Start With
Read `docs/PROGRESS.md` to understand current project state.
Then read `docs/11-storage-design.md` in full.
Start with the R2 client and `StorageService.upload`, then the Prisma models, then the endpoints.
At the end, merge the PR, then update `docs/PROGRESS.md` Phase 7 section with actual file paths created.
