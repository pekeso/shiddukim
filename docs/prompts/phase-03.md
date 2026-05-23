# Phase 3 Prompt — RBAC & Rate Limiting

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
- Monorepo with `apps/backend` (NestJS) and `apps/frontend` (Next.js)
- Docker Compose fully operational
- Prisma connected, initial migration run
- See `docs/PROGRESS.md` for actual file paths and conventions

### Phase 2 — Authentication Foundation ✅
- `User` model with `Role` enum and refresh token rotation
- `HashingService`, `JwtAuthGuard`, `AccessTokenStrategy`
- `@CurrentUser()` decorator
- `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh-token`
- See `docs/PROGRESS.md` for actual file paths and hashing library used

## Reference Docs to Read First
- `docs/09-development-plan.md` — Phase 3 sub-tasks
- `docs/04-roles-permissions.md` — full roles and permissions list
- `docs/PROGRESS.md` — conventions from Phases 1 and 2

## Current Phase: 3 — RBAC & Rate Limiting

**Deliverable:** Every endpoint can declare required permissions using a decorator. Role-based access is enforced globally via a guard. Brute-force protection is active on sensitive endpoints using Redis.

### Sub-tasks
1. Define `Permission` constants (strings): `member.create`, `member.read`, `member.update`, `member.delete`, `community.create`, `community.update`, `marriage.create`, `marriage.review`, `marriage.classify`, `appointment.create`, `appointment.manage`, `document.generate`, `document.view`, `dashboard.view`, `audit.view`
2. Create `ROLE_PERMISSIONS` map: each Role → array of Permission strings
3. Create `@RequirePermissions(...permissions)` decorator (sets route metadata)
4. Create `@Public()` decorator (bypasses JwtAuthGuard)
5. Create `PermissionsGuard`: reads metadata, resolves user role → permissions, throws `ForbiddenException` with French message if denied
6. Apply `JwtAuthGuard` and `PermissionsGuard` globally in `AppModule`
7. Mark public routes with `@Public()`: login, health, member activation endpoints (to come), docs
8. Install `@nestjs/throttler` with Redis store (`throttler-storage-redis`)
9. Configure global throttler (e.g. 60 req / 60s)
10. Apply stricter throttle on `POST /auth/login`, `POST /auth/request-otp`, `POST /auth/verify-otp`

## Git Workflow for This Phase
- Branch: `feature/phase-03-rbac` from `develop`
- Commit after: constants/map, guard, decorators, throttler setup
- Open a PR from `feature/phase-03-rbac` → `develop` when the deliverable is met

## Start With
Read `docs/PROGRESS.md` to understand current project state and conventions.
Then read `docs/04-roles-permissions.md` for the full list of roles and permissions.
Start with the Permission constants and ROLE_PERMISSIONS map, then build the guard.
At the end, merge the PR, then update `docs/PROGRESS.md` Phase 3 section with actual file paths created.
