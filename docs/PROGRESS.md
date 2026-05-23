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
| PDF engine | pdfkit — pure Node.js, no Chromium, decided in Phase 11 |
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
- Status: ✅ Complete
- Branch merged: `feature/phase-07-storage` → `develop`
- Key files created:
  - [x] `apps/backend/prisma/migrations/20260523120041_add_document_fileaccesslog/migration.sql` — Document + FileAccessLog tables, 4 new enums
  - [x] `apps/backend/src/storage/r2.client.ts` — `R2Client` (S3Client for Cloudflare R2); startup HeadBucket health check (warn, don't crash)
  - [x] `apps/backend/src/storage/storage.service.ts` — `StorageService`: upload (MIME + size validation, SHA-256, UUID key), getSignedUrl, deleteObject
  - [x] `apps/backend/src/storage/storage.module.ts` — `StorageModule` (exports StorageService)
  - [x] `apps/backend/src/documents/dto/upload-document.dto.ts` — `UploadDocumentDto` (documentType, ownerType, ownerId, notes)
  - [x] `apps/backend/src/documents/documents.service.ts` — `DocumentsService`: upload, findByCode, getSignedUrl, softDelete; DocumentResponse (no r2ObjectKey), FileAccessLog writes
  - [x] `apps/backend/src/documents/documents.controller.ts` — `DocumentsController`: POST /documents/upload, GET /documents/:code, GET /documents/:code/url
  - [x] `apps/backend/src/documents/documents.module.ts` — `DocumentsModule` (imports StorageModule, PrismaModule, AuditModule, MulterModule)
- Key files updated:
  - [x] `apps/backend/prisma/schema.prisma` — 4 new enums (DocumentType, DocumentStatus, DocumentVisibility, FileAccessAction) + Document + FileAccessLog models
  - [x] `apps/backend/src/prisma/prisma.service.ts` — added `document` and `fileAccessLog` getters
  - [x] `apps/backend/src/app.module.ts` — imports `DocumentsModule`
- Key decisions made:
  - **R2 client:** S3Client with `region: 'auto'` and `forcePathStyle: false` — both required for Cloudflare R2 compatibility.
  - **Startup check:** `R2Client.onModuleInit()` sends HeadBucket to verify credentials/bucket. Failure logs a warning; the app starts in degraded mode — never crashes on storage unavailability.
  - **Object key format:** `{folder}/{year}/{month}/{uuid}.{ext}` — UUID is cryptographically random, no PII. Extension derived from MIME type (not from user-provided file name).
  - **Folder mapping:** `DocumentType` enum maps to R2 folder: MEMBER_PHOTO → `members/photos`, MEMBER_CARD → `members/cards`, MARRIAGE_REQUEST_PDF → `marriage/requests`, MEDICAL_REFERRAL_PDF → `marriage/referrals`, SUPPORTING_DOCUMENT → `documents/uploads`.
  - **SHA-256 checksum:** Computed with Node.js `crypto.createHash('sha256')` before upload. Stored in `Document.checksum` and passed as R2 object metadata (`x-checksum-sha256`).
  - **File size:** Validated in StorageService against `MAX_FILE_SIZE_MB` (default 10 MB). Multer is configured with a 50 MB ceiling as an early guard.
  - **Memory storage:** Files are stored in RAM during the request (Multer `memoryStorage()`). No disk writes. Acceptable for MVP file sizes ≤ 10 MB.
  - **documentCode:** Public identifier format `DOC-YYYY-NNNNN`. Generated with same pattern as `memberCode` (find highest sequence for year, increment, retry 3× on collision, UUID fallback).
  - **Signed URL expiry:** Default 300 s (`R2_SIGNED_URL_EXPIRES_IN`). The `/url` endpoint accepts `?expiresIn=<seconds>` clamped to [30, 3600]. The signed URL itself is never logged (only the access event is).
  - **r2ObjectKey never returned:** `toResponse()` maps Prisma records to `DocumentResponse` — `r2ObjectKey`, `r2Bucket`, `checksum`, and database `id` are excluded.
  - **FileAccessLog pattern:** Follows the fire-and-never-crash AuditService pattern. `logAccess()` is async but errors are caught internally; it never throws.
  - **Soft delete:** `status = DELETED` + `deletedAt` set; DB record kept. Physical R2 deletion deferred to retention policy. `findActiveDocument()` checks `status ≠ DELETED`.
  - **StorageModule exported by DocumentsModule:** Phase 8 (MembersModule photo upload) can import DocumentsModule and inject StorageService directly.
  - **Installed packages:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@types/multer`

---

### Phase 8 — Member Photo Upload
- Status: ✅ Complete
- Branch merged: `feature/phase-08-photo-upload` → `develop`
- Key files created:
  - [x] `apps/backend/prisma/migrations/20260523121523_add_member_photo_document_id/migration.sql` — drops `photoUrl`, adds `photoDocumentId` (nullable Text) on members table
- Key files updated:
  - [x] `apps/backend/prisma/schema.prisma` — replaced `photoUrl String?` with `photoDocumentId String?` on Member model
  - [x] `apps/backend/src/members/members.service.ts` — added `uploadPhoto()`, `getPhotoSignedUrl()`, and private helpers: `findMemberOrThrow()`, `validatePhotoFile()`, `generateDocumentCode()`, `logFileAccess()`; injected `StorageService`; added `PhotoUploadResponse` and `PhotoSignedUrlResponse` interfaces
  - [x] `apps/backend/src/members/members.controller.ts` — added `POST :memberCode/photo` and `GET :memberCode/photo` endpoints
  - [x] `apps/backend/src/members/members.module.ts` — imported `StorageModule`
- Key decisions made:
  - **Photo MIME validation:** JPEG and PNG only (no PDF) — validated in `MembersService.validatePhotoFile()` before calling `StorageService.upload()`. Global limit is 10 MB; photo-specific limit is 5 MB.
  - **Multer ceiling:** Controller uses a 10 MB Multer ceiling as an early guard; real 5 MB enforcement is in the service so the error message is in French and consistent.
  - **Document record:** Each photo upload creates a `Document` record with `documentType: MEMBER_PHOTO`, `ownerType: "Member"`, `ownerId: member.id` (internal DB id, never returned to clients), `visibility: PRIVATE`, `status: ACTIVE`.
  - **Member.photoDocumentId:** Stores the internal `Document.id` (CUID) — never returned to API clients. When a new photo is uploaded, `photoDocumentId` is updated to the new document's id. The previous Document record is kept (soft-delete deferred to retention policy).
  - **documentCode generation:** Uses the same `DOC-YYYY-NNNNN` pattern and retry-on-collision strategy as `DocumentsService`.
  - **MEMBER role ownership:** `GET /members/:memberCode/photo` with role MEMBER checks for a `UserMemberLink` between `actorUserId` and the target member. No link → 403 Forbidden with French message. This is ready for Phase 9 (member activation).
  - **Staff access:** All non-MEMBER roles with `member.read` permission (SUPER_ADMIN, CHURCH_ADMIN, SECRETARY, PASTOR, COMMUNITY_LEADER) can access any member's photo without ownership restriction.
  - **Signed URL expiry:** Fixed at 300 s (default R2 expiry). No override for photo endpoint (simpler than /documents/:code/url).
  - **FileAccessLog:** Every upload logs `UPLOAD` action; every signed URL retrieval logs `VIEW` action. `logFileAccess()` is fire-and-catch (never throws). The signed URL itself is NOT logged.
  - **Audit:** `FILE.UPLOADED` is fired after successful upload (fire-and-forget via `AuditService.log()`). No audit event for photo view (FileAccessLog covers it).
  - **No-photo 404:** French message: `"Le fidèle <code> n'a pas encore de photo de profil."` when `photoDocumentId` is null.
  - **r2ObjectKey never returned:** `PhotoUploadResponse` contains only `{ documentCode, mimeType, fileSize }`. `PhotoSignedUrlResponse` contains only `{ signedUrl, expiresAt }`.
  - **StorageModule re-used directly:** `MembersModule` imports `StorageModule` directly (not via `DocumentsModule`) to avoid circular module coupling.

---

### Phase 9 — Member Activation
- Status: ✅ Complete
- Branch merged: `feature/phase-09-activation` → `develop`
- Key files created:
  - [x] `apps/backend/src/auth/activation/dto/start-activation.dto.ts` — StartActivationDto (memberCode, SHK-YYYY-NNNNN format validation)
  - [x] `apps/backend/src/auth/activation/dto/request-otp.dto.ts` — RequestOtpDto (memberCode)
  - [x] `apps/backend/src/auth/activation/dto/verify-activation.dto.ts` — VerifyActivationDto (memberCode, code, password, min 8 chars)
  - [x] `apps/backend/src/auth/activation/activation.service.ts` — ActivationService: start(), requestOtp(), verify(); maskEmail() helper; transaction for User + UserMemberLink + Member.status update
  - [x] `apps/backend/src/auth/activation/activation.controller.ts` — ActivationController: @Public() + 10 req/60 s throttle on all 3 endpoints
- Key files updated:
  - [x] `apps/backend/src/auth/auth.service.ts` — added public `issueTokenPair()` method so ActivationService can issue tokens without duplicating logic
  - [x] `apps/backend/src/auth/auth.module.ts` — imports VerificationModule; registers ActivationService + ActivationController
- Key decisions made:
  - **Three-step flow:** `start` (eligibility + masked email) → `request-otp` (OTP send) → `verify` (OTP check + account creation + login).
  - **Generic errors:** All ineligibility cases (member not found, suspended, deceased) return the same French generic 400 to prevent member-code enumeration. Only two distinct messages break from generic: `MSG_ALREADY_ACTIVATED` (separate UX concern) and `MSG_NO_EMAIL` (must contact secretary).
  - **Double-activation guard:** Checked at `start` and again at `verify`. Inside the `verify` transaction a race-condition guard re-checks `UserMemberLink` before creating the user account.
  - **DB transaction:** `prisma.client.$transaction()` wraps `user.create`, `userMemberLink.create`, and `member.update` atomically so a partial failure leaves no orphaned records.
  - **OTP delegation:** `VerificationService.startVerification()` and `.verifyCode()` are called directly. Cooldown enforcement, attempt tracking, expiry, provider calls, `OtpVerification` persistence, and `AUTH.OTP_REQUESTED` / `AUTH.OTP_VERIFIED` audits are all handled inside `VerificationService` — no duplication in `ActivationService`.
  - **Immediate login:** `verify` calls `AuthService.issueTokenPair()` after account creation and returns `accessToken + refreshToken` in the same response (same shape as POST /auth/login). The user does not need a separate login call.
  - **maskEmail helper:** Preserves only the first character of the local part — `joel.mbiye@gmail.com` → `j***@gmail.com`. Domain is returned in full.
  - **MEMBER.ACTIVATED audit:** Fired fire-and-forget after the transaction commits. `entityId` = `memberCode` (public identifier). Metadata includes the channel used.
  - **Rate limiting:** 10 req/60 s per IP on all three endpoints (stricter than global 60/60 s; comparable to login's 5/60 s adjusted for the 3-call flow).
  - **Password minimum:** 8 characters, enforced by `@MinLength` in `VerifyActivationDto`.

---

### Phase 10 — Marriage Workflow
- Status: ✅ Complete
- Branch merged: `feature/phase-10-marriage` → `develop`
- Key files created:
  - [x] `apps/backend/prisma/migrations/20260523123508_add_marriage_request/migration.sql` — MarriageRequestStatus enum, MarriageClassification enum, marriage_requests table + indexes
  - [x] `apps/backend/src/marriage/constants/status-transitions.ts` — `ALLOWED_TRANSITIONS` map, `STATUS_LABELS` French labels, `CLASSIFICATION_ALLOWED_STATUSES` set
  - [x] `apps/backend/src/marriage/dto/create-marriage-request.dto.ts` — `CreateMarriageRequestDto` (all fields optional at creation)
  - [x] `apps/backend/src/marriage/dto/update-pastoral-notes.dto.ts` — `UpdatePastoralNotesDto`
  - [x] `apps/backend/src/marriage/dto/update-status.dto.ts` — `UpdateStatusDto` (MarriageRequestStatus enum)
  - [x] `apps/backend/src/marriage/dto/update-classification.dto.ts` — `UpdateClassificationDto` (MarriageClassification enum)
  - [x] `apps/backend/src/marriage/dto/query-marriage-requests.dto.ts` — `QueryMarriageRequestsDto` (status filter + pagination)
  - [x] `apps/backend/src/marriage/marriage.service.ts` — `MarriageService`: create, submit, findAll, findByCode, updatePastoralNotes, updateStatus, updateClassification; `generateRequestCode()`, `enforceOwnership()`, `findRequestOrThrow()`, `toResponse()`
  - [x] `apps/backend/src/marriage/marriage.controller.ts` — `MarriageController`: 7 endpoints under `/marriage-requests`
  - [x] `apps/backend/src/marriage/marriage.module.ts` — `MarriageModule` (imports PrismaModule, AuditModule)
- Key files updated:
  - [x] `apps/backend/prisma/schema.prisma` — `MarriageRequestStatus` enum, `MarriageClassification` enum, `MarriageRequest` model, `marriageRequests` relation on `Member`
  - [x] `apps/backend/src/prisma/prisma.service.ts` — added `marriageRequest` getter
  - [x] `apps/backend/src/app.module.ts` — imports `MarriageModule`
- Key decisions made:
  - **requestCode format:** `MAR-YYYY-NNNNN` — same generation strategy as `memberCode` (find highest for year, increment, retry 3× on collision, timestamp fallback). DB unique constraint is the final safety net.
  - **memberId from UserMemberLink:** `POST /marriage-requests` does NOT accept `memberId` from the client. The service resolves the actor's linked member via `userMemberLink.findFirst({ where: { userId: actorUserId } })`. If no link exists, a French 400 is thrown.
  - **Status transition map:** `ALLOWED_TRANSITIONS` constant is the single source of truth for the state machine. Invalid transitions throw `BadRequestException` with a French message naming the current status, the target status, and listing allowed alternatives.
  - **Submit validation:** Before transitioning DRAFT → SUBMITTED, the service validates: (1) `spouseFullName` is non-empty; (2) at least one of `spousePhone` or `spouseEmail` is present. Both checks throw French 400 errors.
  - **MEMBER scoping:** `findAll` and `findByCode` enforce role-based data access. MEMBER role: scoped to their own requests via `userMemberLink`. Other roles (PASTOR, CHURCH_ADMIN, etc.): can see all requests.
  - **Classification guard:** `CLASSIFICATION_ALLOWED_STATUSES` set contains UNDER_REVIEW and all subsequent statuses. Classification on DRAFT or SUBMITTED throws French 400.
  - **Audit events:** `MARRIAGE.SUBMITTED` (on submit), `MARRIAGE.REVIEWED` (on status change), `MARRIAGE.CLASSIFIED` (on classification). All include `requestCode`, `memberCode`, old and new values. Fire-and-forget via `AuditService.log()`.
  - **reviewedAt timestamp:** Updated on every pastoral action (notes update, status change, classification). Records the last pastoral interaction.
  - **`toResponse()` shape:** Returns `requestCode`, `memberCode` (from joined Member), spouse fields, status, classification, pastorNotes, timestamps. Internal `id` and `memberId` are NEVER returned.
  - **Permissions used:** `marriage.create` (create + submit + read own); `marriage.review` (notes + status); `marriage.classify` (GREEN/ORANGE/RED). No new permissions needed — all existed in Phase 3.
  - **Terminal statuses:** REJECTED and COMPLETED have empty allowed-transitions arrays. Attempting any transition from them returns French 400 with "Ce statut est terminal" message.

---

### Phase 11 — Documents & PDF Generation
- Status: ✅ Complete
- Branch merged: `feature/phase-11-pdf` → `develop`
- Key files created:
  - [x] `apps/backend/src/documents/pdf/pdf.service.ts` — `PdfService` with `generateMarriageRequestPdf(data)` and `generateMedicalReferralPdf(data)` — pure data-in / Buffer-out, no DB
- Key files updated:
  - [x] `apps/backend/src/marriage/marriage.service.ts` — added `generateMarriageRequestPdf()`, `generateMedicalReferralPdf()`, `findRequestWithMemberDetails()`, `generateDocumentCode()`, `logFileAccess()` private helpers; injected `StorageService` and `PdfService`
  - [x] `apps/backend/src/marriage/marriage.controller.ts` — added `POST /:requestCode/generate-pdf` and `POST /:requestCode/generate-medical-referral` (both require `document.generate`)
  - [x] `apps/backend/src/marriage/marriage.module.ts` — imports `StorageModule`; provides `PdfService`
  - [x] `apps/backend/src/documents/documents.service.ts` — added `findAll()` with RBAC scoping + pagination; updated `getSignedUrl()` with `actorRole` param + MEMBER ownership enforcement + FILE.DOWNLOADED audit; added `enforceDocumentOwnership()` private helper
  - [x] `apps/backend/src/documents/documents.controller.ts` — added `GET /documents` endpoint; added `QueryDocumentsDto`; passed `user.role` to `getSignedUrl()`
- Key decisions made:
  - **PDF library: `pdfkit`** — lightweight, pure Node.js, no Chromium/browser dependency. Good for data-heavy document layouts without complex HTML templating. Installed as `pdfkit` + `@types/pdfkit`.
  - **PdfService architecture:** Pure presentational service — accepts typed data objects (`MarriagePdfData`, `MedicalReferralPdfData`) and returns `Buffer`. No DB access. Callers are responsible for DB queries, R2 upload, Document record creation, and audit events. Fully testable in isolation.
  - **PDF layout:** A4, pdfkit `PDFDocument` stream buffered into a `Promise<Buffer>`. French content, two-colour brand (primary `#1E3A5F`, accent `#2C7BE5`). Church header, section titles with accent underline, two-column label/value rows (`drawField()`), footer with generation timestamp.
  - **Marriage request PDF sections:** Informations du demandeur (nom, code, communauté, date de naissance) → Informations sur le/la conjoint(e) (nom, téléphone, e-mail) → Projet matrimonial (numéro, date souhaitée, date de soumission) → Footer.
  - **Medical referral PDF sections:** Church header → object paragraph → Informations du couple → Instructions médicales (6 bullet points: groupage, VIH, hépatites, syphilis, drépanocytose, autre) → Zone de signature du pasteur (signature line) → Zone de cachet + date boxes.
  - **PDF orchestration in MarriageService:** Each generate method: (1) query DB with `findRequestWithMemberDetails()` including `member.community`, (2) format dates via `formatDateFr` / `formatDateTimeFr` exported from PdfService, (3) generate buffer, (4) upload via `StorageService.upload()` with `mimeType: 'application/pdf'`, (5) generate `DOC-YYYY-NNNNN` code (same 3-retry + UUID fallback pattern as DocumentsService), (6) create `Document` record (`ownerType: 'MarriageRequest'`, `generatedByUserId` set, `uploadedByUserId: null`), (7) log `FileAccessAction.GENERATE` in FileAccessLog, (8) audit `DOCUMENT.GENERATED` (fire-and-forget), (9) generate signed URL (300 s), return `{ documentCode, signedUrl, signedUrlExpiresAt }`.
  - **Medical referral GREEN guard:** If `classification !== GREEN`, throws `BadRequestException` with French message including the current classification. Check runs before PDF generation.
  - **GET /documents scoping:** MEMBER role: resolves `UserMemberLink` → `memberId` → queries for `ownerType: 'Member' AND ownerId = memberId` OR `ownerType: 'MarriageRequest' AND ownerId IN (member's request ids)`. Other roles with `document.view`: no filter (see all). Pagination default 20, max 100. Soft-deleted always excluded (`status: { not: DELETED }`).
  - **Ownership on GET /documents/:documentCode/url:** Added `actorRole: string` param to `DocumentsService.getSignedUrl()`. MEMBER role calls `enforceDocumentOwnership()`: for `Member` docs checks `ownerId === link.memberId`; for `MarriageRequest` docs checks `marriageRequest.memberId === link.memberId` via DB; any other ownerType → 403 for MEMBER.
  - **FILE.DOWNLOADED audit:** Added fire-and-forget `AuditAction.FILE.DOWNLOADED` event on every `getSignedUrl()` call (previously only FileAccessLog was written).
  - **Role type:** `actorRole` kept as `string` (matching existing `MarriageService` + `AuthenticatedUser.role` pattern) — no `Role` enum import needed in DocumentsService.

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
