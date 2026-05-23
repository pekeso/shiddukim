# Phase 8 Prompt — Member Photo Upload

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
- Never expose database IDs publicly — use `memberCode` and `documentCode` in all responses
- R2 bucket is PRIVATE — signed URLs only, default 300s expiry
- Log every file access in `FileAccessLog`
- The UI must be in French

## Completed Phases

### Phase 1 — Infrastructure & Monorepo ✅
### Phase 2 — Authentication Foundation ✅
### Phase 3 — RBAC & Rate Limiting ✅
### Phase 4 — Audit Logging ✅
### Phase 5 — Verification Service (OTP) ✅
### Phase 6 — Member Registry ✅
### Phase 7 — File Storage (R2) ✅
- `StorageService` with upload, checksum, signed URL generation
- `Document` and `FileAccessLog` Prisma models
- `POST /documents/upload`, `GET /documents/:documentCode`, `GET /documents/:documentCode/url`
- R2 folder convention: `{domain}/{year}/{month}/{uuid}.{ext}`
- See `docs/PROGRESS.md` for actual file paths and conventions

## Reference Docs to Read First
- `docs/09-development-plan.md` — Phase 8 sub-tasks
- `docs/11-storage-design.md` — storage folder conventions
- `docs/PROGRESS.md` — all conventions so far (especially Phase 6 member endpoints and Phase 7 storage service)

## Current Phase: 8 — Member Photo Upload

**Deliverable:** Secretaries and admins can upload a profile photo for any member. Members can retrieve their own photo as a signed URL. All photo access is logged.

### Sub-tasks
1. `POST /members/:memberCode/photo` — upload member photo (requires `member.update`)
   - Accept `multipart/form-data` with file field
   - Validate: JPEG or PNG only, max 5 MB
   - Use `StorageService.upload` with folder `members/photos/`
   - Create `Document` record: `documentType: MEMBER_PHOTO`, link to member
   - Update `Member` to reference the new photo document (add `photoDocumentId` or equivalent)
   - Audit `FILE.UPLOADED` via `AuditService`
   - Return document metadata (documentCode, mimeType, fileSize) — not the raw R2 key
2. `GET /members/:memberCode/photo` — get signed URL for member photo
   - Members can only access their own photo
   - Admins, secretaries, pastors can access any member photo
   - Generate signed URL using `StorageService.getSignedUrl`
   - Log access to `FileAccessLog` with action `VIEW`
   - Return `{ signedUrl, expiresAt }` — never return R2 object key directly
3. Add Prisma migration if `photoDocumentId` or similar field is added to `Member`
4. Handle case where member has no photo: return 404 with French message

## Git Workflow for This Phase
- Branch: `feature/phase-08-photo-upload` from `develop`
- Commit after: upload endpoint, retrieval endpoint, any Prisma migration
- Open a PR from `feature/phase-08-photo-upload` → `develop` when the deliverable is met

## Start With
Read `docs/PROGRESS.md` to understand the StorageService API and Member model from previous phases.
Then check how `StorageService.upload` and `getSignedUrl` are implemented (look at Phase 7 files).
Start with the upload endpoint, then the retrieval endpoint.
At the end, merge the PR, then update `docs/PROGRESS.md` Phase 8 section with actual file paths modified/created.
