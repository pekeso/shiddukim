# Phase 2 Prompt — Authentication Foundation

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
- Docker Compose: postgres:16, redis:7, backend (port 4000), frontend (port 3000)
- Prisma connected with initial migration
- Global prefix `/api/v1`, ValidationPipe, exception filter
- Health check: `GET /api/v1/health`
- Tailwind CSS + shadcn/ui configured with brand colors
- See `docs/PROGRESS.md` for actual file paths and decisions made

## Reference Docs to Read First
- `docs/09-development-plan.md` — Phase 2 sub-tasks
- `docs/04-roles-permissions.md` — roles and permissions reference
- `docs/05-data-model.md` — User model
- `docs/10-security-requirements.md` — auth security requirements
- `docs/PROGRESS.md` — conventions decided in Phase 1

## Current Phase: 2 — Authentication Foundation

**Deliverable:** Users can log in with email and password, receive a JWT access token and a refresh token, log out, and rotate tokens. Passwords are hashed securely. Endpoints return French error messages.

### Sub-tasks
1. Add full `User` model to Prisma: `id`, `email`, `phone`, `passwordHash`, `status`, `role`, `refreshTokenHash`, `refreshTokenExpiresAt`, `lastLoginAt`, `createdAt`, `updatedAt`
2. Add `UserStatus` enum: `ACTIVE`, `INACTIVE`, `SUSPENDED`
3. Add `Role` enum: `SUPER_ADMIN`, `CHURCH_ADMIN`, `SECRETARY`, `PASTOR`, `COMMUNITY_LEADER`, `MEMBER`
4. Run migration
5. Create `HashingService` with `hash(plain)` and `compare(plain, hash)` — use argon2 or bcrypt
6. Install `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`
7. Create `AccessTokenStrategy` and `JwtAuthGuard`
8. Create `@CurrentUser()` decorator to extract authenticated user from request
9. Implement `POST /auth/login`: validate credentials, return `accessToken` + `refreshToken`
10. Implement `POST /auth/logout`: clear `refreshTokenHash` from DB (requires auth)
11. Implement `POST /auth/refresh-token`: validate refresh token, issue new pair, invalidate old one
12. Use generic French error messages on login failure — never reveal whether email exists
13. Validate all inputs with DTOs (`LoginDto`, `RefreshTokenDto`)

## Git Workflow for This Phase
- Branch: `feature/phase-02-auth` from `develop`
- Commit after each sub-task group (Prisma model, hashing, JWT, endpoints)
- Never commit secrets or `.env` files
- Open a PR from `feature/phase-02-auth` → `develop` when the deliverable is met

## Start With
Read `docs/PROGRESS.md` to understand the current project state and conventions from Phase 1.
Then read `docs/09-development-plan.md` Phase 2.
Start with the Prisma `User` model migration, then build `HashingService`, then JWT.
At the end, merge the PR, then update `docs/PROGRESS.md` Phase 2 section with actual file paths and the hashing library chosen.
