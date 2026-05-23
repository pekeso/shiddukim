# Project Progress

Update this file at the end of every phase.
Each new phase conversation should start with: read this file + the relevant phase prompt.

---

## Git Conventions (fixed — do not change)

| Rule | Value |
|---|---|
| Default branch | `main` — production-ready only |
| Integration branch | `develop` — all phase PRs merge here |
| Feature branches | `feature/phase-XX-name` — one per phase |
| Commit format | Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:` |
| Env files | Never commit `.env*` — only `.env.example` is committed |
| Release tags | `v1.0.0-mvp` on `main` after Phase 14 |

---

## Technical Conventions (fill in as they are decided)

| Convention | Decision |
|---|---|
| Monorepo tool | npm workspaces |
| Backend port | 4000 |
| Frontend port | 3000 |
| PostgreSQL host port (dev) | 5433 (5432 is taken by local PostgreSQL 17) |
| API prefix | /api/v1 |
| Public ID format for members | SHK-YYYY-NNNNN |
| Public ID format for marriage requests | MAR-YYYY-NNNNN |
| Password hashing | argon2 (decide in Phase 2) |
| PDF engine | pdfkit / puppeteer — decide in Phase 11 |
| Test framework | Jest (NestJS default) |
| OTP default channel | EMAIL |
| Prisma version | v7 (TypeScript-native client, `prisma-client` generator) |
| Prisma runtime adapter | `@prisma/adapter-pg` + `pg` |
| Prisma seed runner | `tsx` (via `prisma.config.ts` → `migrations.seed`) |
| Tailwind version | v4 (CSS-based config, no tailwind.config.ts) |
| Next.js version | 16 (App Router) |

---

## Phase Completion Log

### Phase 1 — Infrastructure & Monorepo
- Status: ✅ Complete
- Branch merged: `feature/phase-01-infrastructure` → `develop`
- Key files created:
  - [x] `.gitignore`
  - [x] `.env.example`
  - [x] `README.md`
  - [x] `package.json` — npm workspaces root
  - [x] `.editorconfig`
  - [x] `.prettierrc`
  - [x] `commitlint.config.js`
  - [x] `.husky/pre-commit` — lint-staged
  - [x] `.husky/commit-msg` — commitlint
  - [x] `apps/backend/` — NestJS 11 app
  - [x] `apps/backend/src/main.ts` — global prefix `/api/v1`, ValidationPipe, AllExceptionsFilter, CORS
  - [x] `apps/backend/src/app.module.ts` — ConfigModule (zod validation), PrismaModule
  - [x] `apps/backend/src/common/config/env.validation.ts` — zod env schema
  - [x] `apps/backend/src/common/filters/all-exceptions.filter.ts` — global exception filter
  - [x] `apps/backend/src/health/health.controller.ts` — `GET /api/v1/health`
  - [x] `apps/backend/src/prisma/prisma.service.ts` — PrismaService with PrismaPg adapter
  - [x] `apps/backend/src/prisma/prisma.module.ts` — global PrismaModule
  - [x] `apps/backend/prisma/schema.prisma` — User + Member skeleton models
  - [x] `apps/backend/prisma/migrations/20260523093708_init/migration.sql` — first migration
  - [x] `apps/backend/prisma/seed.ts` — SUPER_ADMIN seed user
  - [x] `apps/backend/prisma.config.ts` — Prisma v7 config (datasource URL + seed command)
  - [x] `apps/backend/Dockerfile`
  - [x] `apps/frontend/` — Next.js 16 app (App Router)
  - [x] `apps/frontend/app/globals.css` — Tailwind v4 + shadcn/ui + brand colors
  - [x] `apps/frontend/app/layout.tsx` — French locale (`lang="fr"`), Shiddukim metadata
  - [x] `apps/frontend/components.json` — shadcn/ui config
  - [x] `apps/frontend/components/ui/button.tsx` — first shadcn component
  - [x] `apps/frontend/next.config.ts` — standalone output, API URL
  - [x] `apps/frontend/Dockerfile`
  - [x] `docker-compose.yaml` — postgres:16, redis:7, backend, frontend with healthchecks
- Key decisions made:
  - **Monorepo tool:** npm workspaces
  - **Prisma v7:** Uses TypeScript-native `prisma-client` generator (not `prisma-client-js`). `DATABASE_URL` lives in `prisma.config.ts` only (not in `schema.prisma`). Runtime connection via `@prisma/adapter-pg`.
  - **PostgreSQL dev port:** 5433 (port 5432 is occupied by a local PostgreSQL 17 installation on the dev machine — the Docker container maps `5433→5432`).
  - **Tailwind v4:** CSS-based config (`@theme` block in `globals.css`), no `tailwind.config.ts`.
  - **Seed runner:** `tsx` (not `ts-node`) for Prisma v7 ESM/nodenext compatibility.
  - **env validation:** zod (not joi) in `apps/backend/src/common/config/env.validation.ts`.
  - **Exception filter:** Catches all exceptions, returns `{ statusCode, message, error, timestamp, path }` — messages in French.

---

### Phase 2 — Authentication Foundation
- Status: ⬜ Not started
- Key files created:
  - [ ] `apps/backend/prisma/migrations/...` — User model
  - [ ] `apps/backend/src/auth/auth.module.ts`
  - [ ] `apps/backend/src/auth/auth.service.ts`
  - [ ] `apps/backend/src/auth/strategies/jwt.strategy.ts`
  - [ ] `apps/backend/src/common/services/hashing.service.ts`
- Key decisions made:
  - (fill in after phase)

---

### Phase 3 — RBAC & Rate Limiting
- Status: ⬜ Not started
- Key files created:
  - [ ] `apps/backend/src/common/constants/permissions.ts`
  - [ ] `apps/backend/src/common/constants/role-permissions.ts`
  - [ ] `apps/backend/src/common/guards/permissions.guard.ts`
  - [ ] `apps/backend/src/common/decorators/require-permissions.decorator.ts`
  - [ ] `apps/backend/src/common/decorators/public.decorator.ts`
- Key decisions made:
  - (fill in after phase)

---

### Phase 4 — Audit Logging
- Status: ⬜ Not started
- Key files created:
  - [ ] `apps/backend/prisma/migrations/...` — AuditLog model
  - [ ] `apps/backend/src/audit/audit.module.ts`
  - [ ] `apps/backend/src/audit/audit.service.ts`
  - [ ] `apps/backend/src/common/constants/audit-actions.ts`
- Key decisions made:
  - (fill in after phase)

---

### Phase 5 — Verification Service (OTP)
- Status: ⬜ Not started
- Key files created:
  - [ ] `apps/backend/prisma/migrations/...` — OtpVerification model
  - [ ] `apps/backend/src/verification/verification.module.ts`
  - [ ] `apps/backend/src/verification/verification.service.ts`
  - [ ] `apps/backend/src/verification/providers/twilio.provider.ts`
- Key decisions made:
  - (fill in after phase)

---

### Phase 6 — Member Registry
- Status: ⬜ Not started
- Key files created:
  - [ ] `apps/backend/prisma/migrations/...` — Member, Community, UserMemberLink models
  - [ ] `apps/backend/src/members/members.module.ts`
  - [ ] `apps/backend/src/members/members.service.ts`
  - [ ] `apps/backend/src/members/members.controller.ts`
  - [ ] `apps/backend/src/communities/communities.module.ts`
- Key decisions made:
  - (fill in after phase)

---

### Phase 7 — File Storage (R2)
- Status: ⬜ Not started
- Key files created:
  - [ ] `apps/backend/prisma/migrations/...` — Document, FileAccessLog models
  - [ ] `apps/backend/src/storage/storage.module.ts`
  - [ ] `apps/backend/src/storage/storage.service.ts`
  - [ ] `apps/backend/src/storage/r2.client.ts`
  - [ ] `apps/backend/src/documents/documents.module.ts`
- Key decisions made:
  - (fill in after phase)

---

### Phase 8 — Member Photo Upload
- Status: ⬜ Not started
- Key files created:
  - [ ] `apps/backend/src/members/members.controller.ts` (photo endpoints added)
- Key decisions made:
  - (fill in after phase)

---

### Phase 9 — Member Activation
- Status: ⬜ Not started
- Key files created:
  - [ ] `apps/backend/src/auth/activation/activation.service.ts`
  - [ ] `apps/backend/src/auth/activation/activation.controller.ts`
- Key decisions made:
  - (fill in after phase)

---

### Phase 10 — Marriage Workflow
- Status: ⬜ Not started
- Key files created:
  - [ ] `apps/backend/prisma/migrations/...` — MarriageRequest model
  - [ ] `apps/backend/src/marriage/marriage.module.ts`
  - [ ] `apps/backend/src/marriage/marriage.service.ts`
  - [ ] `apps/backend/src/marriage/marriage.controller.ts`
  - [ ] `apps/backend/src/marriage/constants/status-transitions.ts`
- Key decisions made:
  - (fill in after phase)

---

### Phase 11 — Documents & PDF Generation
- Status: ⬜ Not started
- Key files created:
  - [ ] `apps/backend/src/documents/pdf/pdf.service.ts`
  - [ ] `apps/backend/src/documents/pdf/templates/` — PDF templates
- Key decisions made:
  - (fill in after phase)

---

### Phase 12 — Appointments
- Status: ⬜ Not started
- Key files created:
  - [ ] `apps/backend/prisma/migrations/...` — Appointment model
  - [ ] `apps/backend/src/appointments/appointments.module.ts`
  - [ ] `apps/backend/src/appointments/appointments.service.ts`
  - [ ] `apps/backend/src/appointments/appointments.controller.ts`
  - [ ] `apps/backend/src/notifications/notifications.service.ts`
- Key decisions made:
  - (fill in after phase)

---

### Phase 13 — Frontend & Dashboard
- Status: ⬜ Not started
- Key files created:
  - [ ] `apps/frontend/app/(auth)/connexion/page.tsx`
  - [ ] `apps/frontend/app/(auth)/activation/page.tsx`
  - [ ] `apps/frontend/app/(admin)/tableau-de-bord/page.tsx`
  - [ ] `apps/frontend/app/(admin)/fideles/page.tsx`
  - [ ] `apps/frontend/app/(admin)/dossiers-matrimoniaux/page.tsx`
  - [ ] `apps/frontend/app/(member)/mon-profil/page.tsx`
- Key decisions made:
  - (fill in after phase)

---

### Phase 14 — Testing & Hardening
- Status: ⬜ Not started
- Key files created:
  - [ ] Test files for core services
  - [ ] Security hardening applied
- Key decisions made:
  - (fill in after phase)
