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
- Status: ✅ Complete
- Branch merged: `feature/phase-02-auth` → `develop`
- Key files created:
  - [x] `apps/backend/prisma/migrations/20260523102207_add_refresh_token_fields_to_user/migration.sql` — adds `refreshTokenHash`, `refreshTokenExpiresAt` to User
  - [x] `apps/backend/src/common/services/hashing.service.ts` — argon2id `hash()` and `compare()`
  - [x] `apps/backend/src/auth/strategies/jwt.strategy.ts` — `JwtStrategy` (Passport), `JwtPayload`, `AuthenticatedUser` interfaces
  - [x] `apps/backend/src/auth/guards/jwt-auth.guard.ts` — `JwtAuthGuard` with French 401
  - [x] `apps/backend/src/common/decorators/current-user.decorator.ts` — `@CurrentUser()` param decorator
  - [x] `apps/backend/src/auth/dto/login.dto.ts` — `LoginDto` (email + password, French validation messages)
  - [x] `apps/backend/src/auth/dto/refresh-token.dto.ts` — `RefreshTokenDto` (JWT string, French validation)
  - [x] `apps/backend/src/auth/auth.service.ts` — `AuthService`: login, refreshToken, logout, generateAndStoreTokens
  - [x] `apps/backend/src/auth/auth.controller.ts` — `POST /api/v1/auth/login`, `/refresh-token`, `/logout`
  - [x] `apps/backend/src/auth/auth.module.ts` — wires all auth providers; exports `HashingService`, `JwtAuthGuard`, `JwtStrategy`
  - [x] `apps/backend/src/app.module.ts` — imports `AuthModule`
- Key decisions made:
  - **Password hashing:** `argon2` (argon2id variant) — `hash()` / `compare()` in `HashingService`
  - **Refresh token design:** Refresh token is a signed JWT (`JWT_REFRESH_SECRET`) containing `{ sub, nonce, type: "refresh" }`. The `nonce` (32 random bytes) is hashed with argon2 and stored in `User.refreshTokenHash`. This separates the token signature from the revocation mechanism.
  - **Token rotation:** On every `refreshToken` call, a new nonce is generated, stored, and the old one is invalidated. Nonce reuse (replay attack) clears all sessions for the user.
  - **Timing-safe login:** When the email is not found, a dummy hash comparison is still performed to prevent timing-based user enumeration.
  - **Generic errors:** Login failure always returns `"Identifiants invalides. Veuillez réessayer."` — never reveals whether the email exists.
  - **Access token expiry:** Configured via `JWT_ACCESS_EXPIRES_IN` (default `15m`), passed as seconds to `signAsync`.
  - **Refresh token expiry:** Configured via `JWT_REFRESH_EXPIRES_IN` (default `7d`), stored in `User.refreshTokenExpiresAt` for fast server-side rejection.
  - **JwtModule:** Registered without a default secret — access and refresh tokens use different secrets per-call.
  - **Installed packages:** `argon2`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `@types/passport-jwt`, `@types/passport`

---

### Phase 3 — RBAC & Rate Limiting
- Status: ✅ Complete
- Branch merged: `feature/phase-03-rbac` → `develop`
- Key files created:
  - [x] `apps/backend/src/common/constants/permissions.ts` — 15 Permission string constants (`member.create` … `audit.view`)
  - [x] `apps/backend/src/common/constants/role-permissions.ts` — `ROLE_PERMISSIONS` map: each Role → Permission[]
  - [x] `apps/backend/src/common/decorators/public.decorator.ts` — `@Public()` sets `IS_PUBLIC_KEY` metadata
  - [x] `apps/backend/src/common/decorators/require-permissions.decorator.ts` — `@RequirePermissions(...permissions)` sets `PERMISSIONS_KEY` metadata
  - [x] `apps/backend/src/common/guards/permissions.guard.ts` — global `PermissionsGuard`; French 403 on denial
  - [x] `apps/backend/src/common/storage/redis-throttler.storage.ts` — `RedisThrottlerStorage` implements `ThrottlerStorage` using ioredis
- Key files updated:
  - [x] `apps/backend/src/auth/guards/jwt-auth.guard.ts` — injects `Reflector`; skips auth when `IS_PUBLIC_KEY` is set
  - [x] `apps/backend/src/app.module.ts` — imports `ThrottlerModule` (Redis store, 60 req/60 s); registers three `APP_GUARD`s in order
  - [x] `apps/backend/src/auth/auth.controller.ts` — `@Public()` on login + refresh-token; strict `@Throttle` on login (5/60 s)
  - [x] `apps/backend/src/health/health.controller.ts` — `@Public()` + `@SkipThrottle()` for infra health probes
- Key decisions made:
  - **Global guard order:** `ThrottlerGuard` (rate limit first) → `JwtAuthGuard` (auth) → `PermissionsGuard` (RBAC). Throttle runs before auth so brute-force attempts are blocked regardless of JWT validity.
  - **@Public() scope:** Both `JwtAuthGuard` and `PermissionsGuard` check `IS_PUBLIC_KEY`; a single decorator opts a route out of the entire auth stack.
  - **No permission = authenticated only:** A protected route without `@RequirePermissions()` passes `PermissionsGuard` — only a valid JWT is required. Fine-grained permission declarations are optional per route.
  - **ThrottlerStorage:** Custom `RedisThrottlerStorage` using `ioredis` directly; no community wrapper dependency. Fixed-window strategy with `INCR` + `PEXPIRE`. `ttl` from `ThrottlerOptions` is in seconds; converted to ms for Redis.
  - **CHURCH_ADMIN excludes `marriage.classify`:** Classification of marriage cases is a pastoral act, not an administrative one. CHURCH_ADMIN cannot classify cases.
  - **Login throttle:** 5 requests / 60 s per IP on `POST /auth/login` (brute-force protection). `POST /auth/refresh-token`: 10 / 60 s.
  - **Installed packages:** `ioredis` (Redis client, used by `RedisThrottlerStorage`)

---

### Phase 4 — Audit Logging
- Status: ✅ Complete
- Branch merged: `feature/phase-04-audit` → `develop`
- Key files created:
  - [x] `apps/backend/prisma/migrations/20260523110519_add_audit_log/migration.sql` — audit_logs table with indexes
  - [x] `apps/backend/src/common/constants/audit-actions.ts` — `AuditAction` constants by domain (AUTH, MEMBER, MARRIAGE, DOCUMENT, FILE, APPOINTMENT, ROLE)
  - [x] `apps/backend/src/audit/audit.service.ts` — `AuditService.log()` fire-and-forget, never throws
  - [x] `apps/backend/src/audit/audit-logs.controller.ts` — `GET /api/v1/audit-logs` with filters + pagination
  - [x] `apps/backend/src/audit/dto/query-audit-logs.dto.ts` — `QueryAuditLogsDto` (actorUserId, action, entityType, from, to, page, limit)
  - [x] `apps/backend/src/audit/audit.module.ts` — exports `AuditService`
- Key files updated:
  - [x] `apps/backend/prisma/schema.prisma` — added `AuditLog` model
  - [x] `apps/backend/src/prisma/prisma.service.ts` — added `auditLog` getter
  - [x] `apps/backend/src/app.module.ts` — imports `AuditModule`
  - [x] `apps/backend/src/auth/auth.module.ts` — imports `AuditModule`
  - [x] `apps/backend/src/auth/auth.service.ts` — injects `AuditService`; fires `AUTH.LOGIN`, `AUTH.FAILED_LOGIN`, `AUTH.LOGOUT`
  - [x] `apps/backend/src/auth/auth.controller.ts` — extracts IP + User-Agent from `Request` and passes as `RequestContext`
- Key decisions made:
  - **Fire-and-forget pattern:** `AuditService.log()` is synchronous (void); the DB write is wrapped in `setImmediate()` so it never adds latency to the calling request. The method signature is `log(event): void`.
  - **Never throws:** All errors inside `persist()` are caught and logged at ERROR level. The calling code is 100% shielded. A missing audit record is preferable to a 500.
  - **RequestContext:** IP and User-Agent are extracted by the controller, not the service. The service receives an optional `RequestContext` — this keeps the service framework-agnostic and testable.
  - **IP extraction:** Checks `X-Forwarded-For` first (reverse proxy support), falls back to `req.socket.remoteAddress`.
  - **Failed login audit:** `entityId` is set to null on unknown-email failures to avoid confirming whether the email exists. When the account is inactive, `entityId` is set (user was found) but the action string is still `auth.failed_login`.
  - **JSON metadata typing:** A `JsonRecord = Record<string, any>` alias is used in the service. Values are serialized through `JSON.parse(JSON.stringify(...))` before Prisma insert to satisfy Prisma v7's strict `InputJsonValue` type without importing generated types.
  - **AuditLog model:** `actorUserId` is nullable (for system events). Indexes on `actorUserId`, `action`, `entityType`, `createdAt` for efficient filter queries.
  - **Pagination:** `GET /audit-logs` defaults to 20 per page, max 100. Returns `{ data, total, page, limit, pages }`.
  - **RBAC:** `GET /audit-logs` requires `audit.view` permission. Only `SUPER_ADMIN` and `CHURCH_ADMIN` hold this permission.

---

### Phase 5 — Verification Service (OTP)
- Status: ✅ Complete
- Branch merged: `feature/phase-05-verification` → `develop`
- Key files created:
  - [x] `apps/backend/prisma/migrations/20260523112251_add_otp_verification/migration.sql` — OtpVerification table + 4 Prisma enums
  - [x] `apps/backend/src/verification/enums/index.ts` — re-exports Prisma-generated enums (VerificationChannel, VerificationPurpose, VerificationProvider, OtpStatus)
  - [x] `apps/backend/src/verification/interfaces/verification-provider.interface.ts` — IVerificationProvider contract + VERIFICATION_PROVIDER DI token
  - [x] `apps/backend/src/verification/providers/twilio.provider.ts` — TwilioVerificationProvider
  - [x] `apps/backend/src/verification/verification.service.ts` — VerificationService
  - [x] `apps/backend/src/verification/verification.module.ts` — VerificationModule
- Key files updated:
  - [x] `apps/backend/prisma/schema.prisma` — 4 new enums + OtpVerification model
  - [x] `apps/backend/src/prisma/prisma.service.ts` — added `otpVerification` getter
  - [x] `apps/backend/src/app.module.ts` — imports VerificationModule
- Key decisions made:
  - **Enum source of truth:** `VerificationChannel`, `VerificationPurpose`, `VerificationProvider`, `OtpStatus` are defined in Prisma schema and re-exported from `verification/enums/index.ts`. No duplication.
  - **DI token:** `VERIFICATION_PROVIDER` symbol allows swapping the provider (e.g. mock in tests, different SMS gateway) without modifying `VerificationService`.
  - **OTP code handling:** Raw codes are NEVER received, stored, or logged by our backend. Twilio Verify manages code generation and validation entirely. We store only the Twilio Verification SID for correlation.
  - **Resend cooldown:** `startVerification` checks for a PENDING record created within `OTP_RESEND_COOLDOWN_SECONDS` (default 60s). If found, throws 429. Stale PENDING records are marked FAILED before issuing a new one.
  - **Attempt tracking:** `verifyCode` increments `attempts` on every failure. At `OTP_MAX_ATTEMPTS` (default 5), throws 429. Status transitions: `PENDING → VERIFIED | EXPIRED | FAILED`.
  - **Expiry:** `expiresAt` is set at creation from `OTP_EXPIRES_IN_MINUTES` (default 10). `verifyCode` marks the record `EXPIRED` when past and throws 400.
  - **Audit metadata:** `targetValue` (email/phone) is excluded from audit metadata to avoid logging PII. Only `channel`, `purpose`, `targetType` (e.g. "email") are stored.
  - **verifyCode return value:** Returns `{ verificationId: string }` so Phase 9 (Member Activation) can link the verified OTP to the newly created user account.
  - **Twilio 20404 handling:** When Twilio returns error code 20404 (verification SID no longer exists — already used or expired), the provider returns `{ valid: false }` instead of throwing, which is treated as an invalid code.
  - **French messages:** All user-facing messages are in French and channel-aware (email/SMS/WhatsApp variants). Generic messages prevent information leakage.
  - **Installed packages:** `twilio` (Twilio Node.js SDK)

---

### Phase 6 — Member Registry
- Status: ✅ Complete
- Branch merged: `feature/phase-06-members` → `develop`
- Key files created:
  - [x] `apps/backend/prisma/migrations/20260523114336_add_member_community_user_member_link/migration.sql` — Gender enum, full Member expansion, Community, UserMemberLink tables + indexes
  - [x] `apps/backend/src/members/dto/create-member.dto.ts` — CreateMemberDto (all fields, French validation)
  - [x] `apps/backend/src/members/dto/update-member.dto.ts` — UpdateMemberDto (no baptism fields — members cannot change church-official data)
  - [x] `apps/backend/src/members/dto/query-members.dto.ts` — QueryMembersDto (search + pagination)
  - [x] `apps/backend/src/members/members.service.ts` — MembersService: create, findAll, findByCode, update, getQrCode, generateMemberCode, detectDuplicates
  - [x] `apps/backend/src/members/members.controller.ts` — MembersController: all 5 endpoints
  - [x] `apps/backend/src/members/members.module.ts` — MembersModule (exports MembersService)
  - [x] `apps/backend/src/communities/dto/create-community.dto.ts` — CreateCommunityDto
  - [x] `apps/backend/src/communities/dto/update-community.dto.ts` — UpdateCommunityDto
  - [x] `apps/backend/src/communities/dto/assign-member.dto.ts` — AssignMemberDto
  - [x] `apps/backend/src/communities/communities.service.ts` — CommunitiesService: create, findAll, findOne, update, assignMember
  - [x] `apps/backend/src/communities/communities.controller.ts` — CommunitiesController: all 5 endpoints
  - [x] `apps/backend/src/communities/communities.module.ts` — CommunitiesModule
- Key files updated:
  - [x] `apps/backend/prisma/schema.prisma` — Gender enum, expanded Member, new Community + UserMemberLink models, UserMemberLink relation on User
  - [x] `apps/backend/src/prisma/prisma.service.ts` — added `community` and `userMemberLink` getters
  - [x] `apps/backend/src/app.module.ts` — imports MembersModule, CommunitiesModule
- Key decisions made:
  - **memberCode generation:** `SHK-YYYY-NNNNN` — finds the highest existing code for the current year, increments, and retries up to 3 times on race collisions. DB unique constraint is the final safety net.
  - **QR code:** `qrcode` npm package generates a base64 PNG data URL encoding the `memberCode` string. Width 300px, error correction M, margin 2. Returned as `{ memberCode, qrCode }`.
  - **Duplicate detection:** Soft warning (not a hard block) on three signals: (1) firstName + lastName + dateOfBirth match, (2) phone match, (3) email match. Returns `duplicateWarnings[]` in the create response so the UI can prompt for confirmation.
  - **Baptism data protection:** `UpdateMemberDto` intentionally omits `baptismDate` and `baptizedBy` — church-official data can only be set at creation (by authorised staff) or via a future admin-only flow.
  - **Response shape:** `toResponse()` maps Prisma records to `MemberResponse` — the database `id` is NEVER included. All API consumers use `memberCode` as the public identifier.
  - **Audit diff:** `MEMBER.UPDATED` metadata includes `{ changedFields: { fieldName: { from, to } } }` for every modified field. No-op updates (nothing changed) skip the DB write and the audit event.
  - **Community president:** Stored internally as `presidentMemberId` (DB UUID). API accepts and returns `presidentMemberCode` (human-readable) — the service resolves between the two transparently.
  - **Community ID in URLs:** Community endpoints use the internal UUID (`/communities/:id`) because communities have no human-readable code. Unlike member IDs, community IDs carry no PII and are safe to expose.
  - **Assign member endpoint:** `POST /communities/:id/members` updates `member.communityId`. Requires `member.update` permission. Returns 409 if the member is already in the same community.
  - **Installed packages:** `qrcode`, `@types/qrcode`

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
