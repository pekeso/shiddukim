# Phase 14 Prompt — Testing & Hardening

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

## All Phases Complete ✅
The platform is fully implemented:
- Auth (login, logout, refresh token rotation)
- RBAC with permission guards
- Audit logging on all sensitive actions
- Twilio email OTP verification
- Member registry with unique codes
- Cloudflare R2 file storage with signed URLs
- Member photo upload and retrieval
- Member activation flow
- Marriage request workflow with status machine
- PDF generation (marriage request + medical referral)
- Appointments with email reminders
- Full French frontend (admin portal, pastor portal, member portal, dashboard)
- See `docs/PROGRESS.md` for all actual file paths, conventions, and decisions

## Reference Docs to Read First
- `docs/09-development-plan.md` — Phase 14 sub-tasks
- `docs/10-security-requirements.md` — full security checklist
- `docs/PROGRESS.md` — all actual file paths to test

## Current Phase: 14 — Testing & Hardening

**Deliverable:** Core business logic is covered by tests. The app handles edge cases gracefully. All French error messages are consistent. Security is verified against the requirements document.

### Sub-tasks

#### Unit Tests (Backend)
1. `HashingService` — hash and compare
2. `VerificationService` (mock Twilio) — startVerification, verifyCode, attempt limit, cooldown
3. Member code generation — format `SHK-YYYY-NNNNN`, uniqueness constraint behavior
4. Marriage request status transition validation — test every valid and invalid transition
5. RBAC `PermissionsGuard` — test each role resolves correct permissions

#### Integration Tests (Backend)
6. Auth flow: `POST /auth/login` → use access token → `POST /auth/refresh-token` → `POST /auth/logout`
7. Member activation flow: `POST /auth/activate/start` → `request-otp` (mock Twilio) → `verify` → user created + linked
8. Marriage request flow: create DRAFT → submit → pastor reviews → classifies → generates PDF
9. File upload and signed URL flow: upload → get signed URL → verify URL has correct expiry

#### Error Handling Audit
10. Every endpoint returns consistent error shape: `{ statusCode, message, error }`
11. All user-facing messages are in French — scan all `throw new HttpException(...)` and `message:` strings
12. No stack traces or internal details leak in production error responses
13. All 401 responses include French message: `"Vous devez être connecté pour accéder à cette ressource."`
14. All 403 responses include French message: `"Vous n'avez pas la permission d'effectuer cette action."`

#### Security Hardening
15. Install and configure `helmet` for HTTP security headers
16. Configure CORS: allow only frontend origin in production
17. Audit all endpoints — verify no route is missing `JwtAuthGuard` or `PermissionsGuard` (except `@Public()` routes)
18. Verify no API response contains a raw database `id` field — all public identifiers should be codes
19. Verify no API response contains a raw R2 object key
20. Verify all file access goes through the signed URL flow (no direct R2 URLs anywhere in frontend)
21. Run through the security checklist in `docs/10-security-requirements.md` line by line
22. Verify OTP endpoints have rate limiting applied
23. Verify refresh token hash is cleared on logout
24. Verify `AuditService` is called for all events listed in `docs/10-security-requirements.md`

#### Final Checks
25. Run `prisma validate` — schema is clean
26. Run all migrations against a fresh database
27. Seed database with test data (SUPER_ADMIN, a few members, a sample marriage request)
28. Verify Docker Compose `docker compose up` starts all services cleanly
29. Smoke test each major flow manually end-to-end

## Git Workflow for This Phase
- Branch: `feature/phase-14-testing` from `develop`
- Commit after each test suite: unit tests, integration tests, security hardening
- When all checks pass: open a PR from `feature/phase-14-testing` → `develop`, then merge `develop` → `main` with a release tag (e.g. `v1.0.0-mvp`)

## Start With
Read `docs/PROGRESS.md` to get the full list of files created across all phases.
Then read `docs/10-security-requirements.md` — this is the security checklist for sub-tasks 15–24.
Start with unit tests for `VerificationService` and the status transition validator, then move to integration tests.
At the end, merge to `develop`, then open final PR from `develop` → `main` and tag `v1.0.0-mvp`.
