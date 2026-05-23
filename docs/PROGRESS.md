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
| Monorepo tool | (e.g. npm workspaces / pnpm / turborepo) |
| Backend port | 4000 |
| Frontend port | 3000 |
| API prefix | /api/v1 |
| Public ID format for members | SHK-YYYY-NNNNN |
| Public ID format for marriage requests | MAR-YYYY-NNNNN |
| Password hashing | (argon2 / bcrypt — decide in Phase 2) |
| PDF engine | (pdfkit / puppeteer — decide in Phase 11) |
| Test framework | Jest (NestJS default) |
| OTP default channel | EMAIL |

---

## Phase Completion Log

### Phase 1 — Infrastructure & Monorepo
- Status: ⬜ Not started
- Key files created:
  - [ ] `.gitignore`
  - [ ] `.env.example`
  - [ ] `README.md`
  - [ ] `apps/backend/` — NestJS app
  - [ ] `apps/frontend/` — Next.js app
  - [ ] `docker-compose.yaml` — finalized
  - [ ] `apps/backend/prisma/schema.prisma` — skeleton
  - [ ] `apps/backend/src/main.ts`
  - [ ] `apps/backend/src/app.module.ts`
- Key decisions made:
  - Monorepo tool: (fill in — npm workspaces / pnpm / turborepo)
  - (other decisions)

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
