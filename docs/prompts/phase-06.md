# Phase 6 Prompt — Member Registry

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
- Never expose database IDs publicly — use `memberCode` as the public identifier in all responses and URLs
- All files stored in R2 must be private; generate short-lived signed URLs for access
- All sensitive actions must be audit-logged
- Use RBAC permissions on every protected endpoint
- The UI must be in French

## Completed Phases

### Phase 1 — Infrastructure & Monorepo ✅
### Phase 2 — Authentication Foundation ✅
### Phase 3 — RBAC & Rate Limiting ✅
### Phase 4 — Audit Logging ✅
### Phase 5 — Verification Service (OTP) ✅
- `VerificationService` interface (channel + provider based)
- `TwilioVerificationProvider` (EMAIL channel active)
- `OtpVerification` Prisma model with attempt tracking and cooldown
- See `docs/PROGRESS.md` for actual file paths and conventions

## Reference Docs to Read First
- `docs/09-development-plan.md` — Phase 6 sub-tasks
- `docs/05-data-model.md` — Member, Community, UserMemberLink models
- `docs/06-workflows.md` — Member Registration Workflow
- `docs/04-roles-permissions.md` — who can create/read/update members
- `docs/PROGRESS.md` — all conventions so far

## Current Phase: 6 — Member Registry

**Deliverable:** Church admins and secretaries can create, search, update, and assign members to communities. Each member gets a unique human-readable code and a QR code. Duplicate detection warns before saving.

### Sub-tasks
1. Add full `Member` model to Prisma (all fields from data model doc)
2. Add `MemberStatus` enum: `CREATED`, `ACTIVATED`, `SUSPENDED`, `DECEASED`
3. Add `Community` model: `id`, `name`, `description`, `presidentMemberId`, `createdAt`, `updatedAt`
4. Add `UserMemberLink` model: `id`, `userId`, `memberId`, `verifiedAt`, `createdAt`
5. Run migration
6. `POST /members` — create member (requires `member.create`) — never expose `id` in response, use `memberCode`
7. `GET /members` — list with search (firstName, lastName, memberCode, communityId) and pagination (requires `member.read`)
8. `GET /members/:memberCode` — get member by public code (requires `member.read`)
9. `PATCH /members/:memberCode` — update basic fields (requires `member.update`) — members cannot change baptism data
10. Generate member code automatically on creation: format `SHK-YYYY-NNNNN` (e.g. `SHK-2026-00001`), DB unique constraint
11. `GET /members/:memberCode/qr-code` — return QR code as base64 PNG encoding the memberCode
12. `POST /communities` — create (requires `community.create`)
13. `GET /communities` — list with member count
14. `GET /communities/:id` — detail
15. `PATCH /communities/:id` — update (requires `community.update`)
16. `POST /communities/:id/members` — assign member to community
17. Duplicate detection on member creation: check `firstName + lastName + dateOfBirth`, `phone`, `email` — return a warning (not hard block)
18. Audit `MEMBER.CREATED` on creation; `MEMBER.UPDATED` on patch (include changed fields in metadata)
19. Validate all inputs with DTOs

## Git Workflow for This Phase
- Branch: `feature/phase-06-members` from `develop`
- Commit after: Prisma migration, code generation, Member CRUD, Community CRUD, duplicate detection
- Open a PR from `feature/phase-06-members` → `develop` when the deliverable is met

## Start With
Read `docs/PROGRESS.md` to understand current project state and file naming conventions.
Then read `docs/05-data-model.md` for the full Member and Community models.
Start with the Prisma migration, then the member code generation logic, then CRUD endpoints.
At the end, merge the PR, then update `docs/PROGRESS.md` Phase 6 section with actual file paths created.
