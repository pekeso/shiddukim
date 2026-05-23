# Phase 10 Prompt — Marriage Workflow

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
- Never expose database IDs — use `requestCode` (format `MAR-YYYY-NNNNN`) as the public identifier
- All status transitions must be validated by the backend — reject invalid transitions with a French error
- All review and classification actions must be audit-logged
- The UI must be in French

## Completed Phases

### Phase 1 — Infrastructure & Monorepo ✅
### Phase 2 — Authentication Foundation ✅
### Phase 3 — RBAC & Rate Limiting ✅
### Phase 4 — Audit Logging ✅
### Phase 5 — Verification Service (OTP) ✅
### Phase 6 — Member Registry ✅
- `Member` model, `UserMemberLink`, member codes
### Phase 7 — File Storage (R2) ✅
### Phase 8 — Member Photo Upload ✅
### Phase 9 — Member Activation ✅
- Full activation flow (start → OTP → verify → user created → member ACTIVATED)
- See `docs/PROGRESS.md` for actual file paths and all conventions

## Reference Docs to Read First
- `docs/09-development-plan.md` — Phase 10 sub-tasks
- `docs/06-workflows.md` — Marriage Request Workflow (all statuses and classifications)
- `docs/05-data-model.md` — MarriageRequest model
- `docs/08-api-contracts.md` — marriage request endpoints
- `docs/PROGRESS.md` — all conventions so far

## Current Phase: 10 — Marriage Workflow

**Deliverable:** Members can submit marriage requests. Pastors can review, add notes, classify, and change status. All status transitions are enforced by a backend state machine.

### Sub-tasks
1. Add full `MarriageRequest` model to Prisma (all fields from data model doc)
2. Add `MarriageRequestStatus` enum: `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `WAITING_APPOINTMENT`, `COUNSELING`, `MEDICAL_REFERRAL`, `WAITING_RESULTS`, `APPROVED`, `REJECTED`, `COMPLETED`
3. Add `MarriageClassification` enum: `GREEN`, `ORANGE`, `RED`
4. Run migration
5. Generate request code automatically: `MAR-YYYY-NNNNN`, DB unique constraint
6. `POST /marriage-requests` — create DRAFT (requires `marriage.create`, MEMBER role)
   - Prefill `memberId` from authenticated user's `UserMemberLink`
   - Return `requestCode` as public identifier, never expose internal `id`
7. `POST /marriage-requests/:requestCode/submit` — DRAFT → SUBMITTED
   - Validate all required fields are present before allowing submission
   - Audit `MARRIAGE.SUBMITTED`
8. `GET /marriage-requests` — list (PASTOR sees all; MEMBER sees only own)
9. `GET /marriage-requests/:requestCode` — get detail
10. `PATCH /marriage-requests/:requestCode` — update pastoral notes (requires `marriage.review`)
11. `PATCH /marriage-requests/:requestCode/status` — change workflow status (requires `marriage.review`)
    - Validate transition against allowed map; throw `BadRequestException` with French message on invalid transition
    - Audit `MARRIAGE.REVIEWED`
12. `PATCH /marriage-requests/:requestCode/classification` — set GREEN / ORANGE / RED (requires `marriage.classify`)
    - Only allowed when status is `UNDER_REVIEW` or later
    - Audit `MARRIAGE.CLASSIFIED`
13. Define status transition map as a constant (e.g. `SUBMITTED → UNDER_REVIEW`, `UNDER_REVIEW → WAITING_APPOINTMENT`, etc.)
14. Validate all inputs with DTOs

## Allowed Status Transitions
```
DRAFT             → SUBMITTED
SUBMITTED         → UNDER_REVIEW
UNDER_REVIEW      → WAITING_APPOINTMENT | COUNSELING | MEDICAL_REFERRAL | REJECTED
WAITING_APPOINTMENT → COUNSELING
COUNSELING        → MEDICAL_REFERRAL | APPROVED | REJECTED
MEDICAL_REFERRAL  → WAITING_RESULTS
WAITING_RESULTS   → APPROVED | REJECTED
APPROVED          → COMPLETED
```

## Git Workflow for This Phase
- Branch: `feature/phase-10-marriage` from `develop`
- Commit after: Prisma migration, status transition map, create/submit endpoints, pastor review endpoints
- Open a PR from `feature/phase-10-marriage` → `develop` when the deliverable is met

## Start With
Read `docs/PROGRESS.md` to understand the current project state, especially how the `Member` model and `UserMemberLink` are structured.
Then read `docs/06-workflows.md` Marriage Request section.
Start with the Prisma model and migration, then the status transition map, then CRUD endpoints.
At the end, merge the PR, then update `docs/PROGRESS.md` Phase 10 section with actual file paths created.
