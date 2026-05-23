# Phase 4 Prompt — Audit Logging

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
- Never expose database IDs publicly — use public codes (e.g. `SHK-2026-00001`)
- All files stored in R2 must be private; generate short-lived signed URLs for access
- All sensitive actions must be audit-logged
- Use RBAC permissions on every protected endpoint
- The UI must be in French

## Completed Phases

### Phase 1 — Infrastructure & Monorepo ✅
### Phase 2 — Authentication Foundation ✅
### Phase 3 — RBAC & Rate Limiting ✅
- Permission constants and `ROLE_PERMISSIONS` map
- `PermissionsGuard` and `@RequirePermissions()` decorator
- `@Public()` decorator
- Rate limiting via `@nestjs/throttler` with Redis store
- See `docs/PROGRESS.md` for actual file paths

## Reference Docs to Read First
- `docs/09-development-plan.md` — Phase 4 sub-tasks
- `docs/05-data-model.md` — AuditLog model
- `docs/10-security-requirements.md` — audit logging requirements
- `docs/PROGRESS.md` — all conventions so far

## Current Phase: 4 — Audit Logging

**Deliverable:** Any service can call `AuditService.log(...)` to record an audit event. The call is non-blocking and never crashes the main request. A restricted endpoint lets admins query audit logs.

### Sub-tasks
1. Add `AuditLog` model to Prisma: `id`, `actorUserId` (nullable), `action`, `entityType`, `entityId`, `metadata` (JSON), `ipAddress`, `userAgent`, `createdAt`
2. Run migration
3. Create `AuditService.log({ actorUserId, action, entityType, entityId, metadata, ipAddress, userAgent })`
4. Make logging non-blocking (fire-and-forget using `setImmediate` or a queue)
5. `AuditService` must never throw or crash the calling request if logging fails — catch all errors internally
6. Create audit action constants organized by domain: `AUTH.LOGIN`, `AUTH.LOGOUT`, `AUTH.FAILED_LOGIN`, `AUTH.OTP_REQUESTED`, `AUTH.OTP_VERIFIED`, `MEMBER.CREATED`, `MEMBER.UPDATED`, `MEMBER.ACTIVATED`, `MARRIAGE.SUBMITTED`, `MARRIAGE.REVIEWED`, `MARRIAGE.CLASSIFIED`, `DOCUMENT.GENERATED`, `FILE.UPLOADED`, `FILE.DOWNLOADED`, `FILE.VIEWED`, `APPOINTMENT.CREATED`, `ROLE.CHANGED`
7. Add audit calls to existing auth endpoints: login success → `AUTH.LOGIN`, login failure → `AUTH.FAILED_LOGIN`, logout → `AUTH.LOGOUT`
8. Create `GET /audit-logs` endpoint: requires `audit.view` permission (SUPER_ADMIN, CHURCH_ADMIN only)
9. Support query filters: `actorUserId`, `action`, `entityType`, `from`, `to`
10. Paginate results (default 20 per page)

## Git Workflow for This Phase
- Branch: `feature/phase-04-audit` from `develop`
- Commit after: Prisma migration, AuditService, audit action constants, wiring into auth, GET endpoint
- Open a PR from `feature/phase-04-audit` → `develop` when the deliverable is met

## Start With
Read `docs/PROGRESS.md` to understand current project state and file naming conventions used so far.
Then read the `AuditLog` model in `docs/05-data-model.md`.
Start with the Prisma migration, then `AuditService`, then wire it into the existing auth endpoints.
At the end, merge the PR, then update `docs/PROGRESS.md` Phase 4 section with actual file paths created.
