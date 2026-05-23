# Development Plan

## Overview

12 phases, each with a clear and testable deliverable.
Every phase builds on the previous one with explicit dependencies respected.
Audit logging is introduced early (Phase 4) so all subsequent phases can use it without retrofitting.

---

## Phase 1: Infrastructure & Monorepo

**Deliverable:** NestJS backend and Next.js frontend boot successfully. PostgreSQL and Redis are reachable. Prisma is connected. Docker Compose is fully operational. Git repository is initialized with a branching strategy and commit conventions in place.

### 1.1 Git repository setup
- Run `git init` at the monorepo root
- Create `.gitignore`: cover Node.js, NestJS, Next.js build artifacts, `.env*` files (except `.env.example`), `node_modules`, `dist`, `.next`, `prisma/migrations/dev`
- Create `.env.example` documenting all required variables without values — this is the only env file committed to Git
- Define branching strategy:
  - `main` — production-ready code only
  - `develop` — integration branch; all phase PRs merge here
  - `feature/phase-XX-name` — one branch per phase
- Define commit message convention (Conventional Commits): `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Install and configure `husky` + `commitlint` to enforce commit message format (optional but recommended)
- Install and configure `lint-staged` + `eslint` for pre-commit linting (optional but recommended)
- Create initial commit: `chore: initialize repository`
- Create and switch to `develop` branch

### 1.2 Monorepo structure
- Create monorepo root with `apps/backend` and `apps/frontend`
- Add root `package.json` with workspace configuration
- Add `.editorconfig` and `README.md`

### 1.2 NestJS backend bootstrap
- Scaffold NestJS app inside `apps/backend`
- Install and configure `@nestjs/config` with `.env` validation using `joi` or `zod`
- Set up global prefix `/api/v1`
- Set up global validation pipe (`class-validator`, `class-transformer`)
- Set up global exception filter for consistent error responses
- Add health check endpoint `GET /api/v1/health`

### 1.3 Next.js frontend bootstrap
- Scaffold Next.js app inside `apps/frontend` using App Router
- Install and configure Tailwind CSS
- Install and configure shadcn/ui
- Set up base layout with French locale
- Define brand colors from UI guidelines (`#003B8E`, `#F2B705`, etc.)

### 1.4 Docker Compose
- Add `postgres:16` service with named volume, port `5432`, and env vars
- Add `redis:7` service with named volume and port `6379`
- Add `backend` service with build context, port `4000`, and `depends_on`
- Add `frontend` service with build context, port `3000`
- Add `.env.example` with all required variables documented

### 1.5 Prisma setup
- Install Prisma inside `apps/backend`
- Configure `DATABASE_URL` via environment
- Create initial `schema.prisma` with `datasource` and `generator` blocks
- Add skeleton models: `User`, `Member` (to be expanded in later phases)
- Run first migration: `prisma migrate dev --name init`
- Create `prisma/seed.ts` with a `SUPER_ADMIN` seed user

### 1.6 Shared types package (optional but recommended)
- Create `packages/shared` for shared TypeScript types and enums
- Export enums: `Role`, `MemberStatus`, `VerificationChannel`, `VerificationPurpose`

---

## Phase 2: Authentication Foundation

**Deliverable:** Users can log in, receive a JWT access token and a refresh token, log out, and rotate tokens. Passwords are hashed securely.

### 2.1 User Prisma model
- Add full `User` model: `id`, `email`, `phone`, `passwordHash`, `status`, `role`, `lastLoginAt`, `createdAt`, `updatedAt`
- Add `UserStatus` enum: `ACTIVE`, `INACTIVE`, `SUSPENDED`
- Run migration

### 2.2 Password hashing
- Install `argon2` (preferred) or `bcrypt`
- Create `HashingService` with `hash(plain)` and `compare(plain, hash)` methods

### 2.3 JWT configuration
- Install `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`
- Configure `JwtModule` with `JWT_ACCESS_SECRET` and `JWT_ACCESS_EXPIRES_IN` (15m)
- Create `AccessTokenStrategy` and `JwtAuthGuard`
- Create `CurrentUser` decorator to extract authenticated user from request

### 2.4 Refresh token rotation
- Add `refreshTokenHash` and `refreshTokenExpiresAt` fields to `User` model
- On login: generate refresh token, hash it, store hash in DB, return raw token to client
- `POST /auth/refresh-token`: validate refresh token, issue new access token and refresh token, invalidate old one
- On logout: clear `refreshTokenHash` from DB

### 2.5 Login and logout endpoints
- `POST /auth/login`: validate credentials, return `accessToken` + `refreshToken`
- `POST /auth/logout`: invalidate refresh token (requires auth)
- Return generic error messages to avoid user enumeration
- Validate input with DTOs (`LoginDto`)

### 2.6 Password reset (optional for MVP if time allows)
- `POST /auth/forgot-password`: accept email, trigger OTP (uses Phase 5)
- `POST /auth/reset-password`: accept OTP + new password, update hash

---

## Phase 3: RBAC & Rate Limiting

**Deliverable:** Every endpoint can declare required permissions. Role-based access is enforced globally. Brute-force protection is in place on sensitive endpoints.

### 3.1 Role and permission definitions
- Define `Role` enum: `SUPER_ADMIN`, `CHURCH_ADMIN`, `SECRETARY`, `PASTOR`, `COMMUNITY_LEADER`, `MEMBER`
- Define `Permission` constants (strings): `member.create`, `member.read`, `member.update`, `member.delete`, `community.create`, `community.update`, `marriage.create`, `marriage.review`, `marriage.classify`, `appointment.create`, `appointment.manage`, `document.generate`, `document.view`, `dashboard.view`, `audit.view`
- Create `ROLE_PERMISSIONS` map: each role → array of permissions

### 3.2 RBAC guard
- Create `PermissionsGuard` that reads `@RequirePermissions()` decorator from route metadata
- Check current user's role → resolve permissions from `ROLE_PERMISSIONS` map
- Throw `ForbiddenException` with French message if permission is missing

### 3.3 Decorators
- `@RequirePermissions(...permissions)` — sets metadata for `PermissionsGuard`
- `@Public()` — marks routes that bypass `JwtAuthGuard`
- Apply `JwtAuthGuard` and `PermissionsGuard` globally; use `@Public()` for login, activation, and health

### 3.4 Rate limiting
- Install `@nestjs/throttler`
- Configure global throttler (e.g. 60 requests / 60 seconds)
- Apply stricter throttle on: `POST /auth/login`, `POST /auth/request-otp`, `POST /auth/verify-otp`
- Use Redis store for distributed rate limiting (`throttler-storage-redis`)

---

## Phase 4: Audit Logging

**Deliverable:** Any service can log an audit event with actor, action, entity, IP, and user agent. All future phases use this without any additional setup.

### 4.1 AuditLog Prisma model
- Add `AuditLog` model: `id`, `actorUserId` (nullable for system actions), `action`, `entityType`, `entityId`, `metadata` (JSON), `ipAddress`, `userAgent`, `createdAt`
- Run migration

### 4.2 AuditService
- Create `AuditService.log({ actorUserId, action, entityType, entityId, metadata, ipAddress, userAgent })`
- Make it fire-and-forget (non-blocking) using `setImmediate` or a BullMQ queue
- Never throw or crash the main request if audit logging fails

### 4.3 AuditInterceptor
- Create `AuditInterceptor` to extract IP address and user agent from request context
- Inject into `AuditService` so callers do not need to extract request metadata manually

### 4.4 Action constants
- Define audit action constants: `AUTH.LOGIN`, `AUTH.LOGOUT`, `AUTH.FAILED_LOGIN`, `AUTH.OTP_REQUESTED`, `AUTH.OTP_VERIFIED`, `MEMBER.CREATED`, `MEMBER.UPDATED`, `MEMBER.ACTIVATED`, `MARRIAGE.SUBMITTED`, `MARRIAGE.REVIEWED`, `MARRIAGE.CLASSIFIED`, `DOCUMENT.GENERATED`, `FILE.UPLOADED`, `FILE.DOWNLOADED`, `FILE.VIEWED`, `APPOINTMENT.CREATED`, `ROLE.CHANGED`

### 4.5 Audit log endpoint (restricted)
- `GET /audit-logs` — requires `audit.view` permission (SUPER_ADMIN, CHURCH_ADMIN only)
- Support filters: `actorUserId`, `action`, `entityType`, `from`, `to`
- Paginate results

---

## Phase 5: Verification Service (OTP)

**Deliverable:** Backend can send a verification code to an email via Twilio and verify the code. The abstraction supports future SMS and WhatsApp channels without logic changes.

### 5.1 VerificationService abstraction
- Create `VerificationService` interface with:
  - `startVerification(recipient, channel, purpose): Promise<StartVerificationResult>`
  - `verifyCode(recipient, channel, code, purpose): Promise<VerifyResult>`
- Define enums: `VerificationChannel` (`EMAIL`, `SMS`, `WHATSAPP`), `VerificationPurpose` (`MEMBER_ACTIVATION`, `PASSWORD_RESET`, `LOGIN_VERIFICATION`, `SENSITIVE_ACTION`)

### 5.2 OtpVerification Prisma model
- Add `OtpVerification` model: `id`, `targetType`, `targetValue`, `provider`, `providerVerificationId`, `channel`, `purpose`, `status`, `attempts`, `expiresAt`, `verifiedAt`, `createdAt`
- Add `OtpStatus` enum: `PENDING`, `VERIFIED`, `EXPIRED`, `FAILED`
- Run migration
- Never store raw OTP codes

### 5.3 Twilio Verify integration
- Install `twilio` SDK
- Create `TwilioVerificationProvider` implementing `VerificationService`
- `startVerification`: call `twilio.verify.v2.services(SID).verifications.create({ to, channel })`
- `verifyCode`: call `twilio.verify.v2.services(SID).verificationChecks.create({ to, code })`
- Store `providerVerificationId` and status in `OtpVerification`
- Handle Twilio errors gracefully; never forward raw Twilio errors to the frontend

### 5.4 Rate limiting and attempt tracking
- Reject `startVerification` if a valid pending verification exists and resend cooldown has not expired (`OTP_RESEND_COOLDOWN_SECONDS`)
- Reject `verifyCode` if `attempts >= OTP_MAX_ATTEMPTS`
- Increment `attempts` on every failed verification check
- Mark as `EXPIRED` when `expiresAt` is in the past

### 5.5 Audit integration
- Audit `AUTH.OTP_REQUESTED` on every `startVerification` call
- Audit `AUTH.OTP_VERIFIED` on successful verification
- Never log OTP codes in audit metadata

### 5.6 French error messages
- Return French messages as defined in `docs/12-twilio-otp-design.md`
- Use generic messages to avoid account enumeration

---

## Phase 6: Member Registry

**Deliverable:** Church admins and secretaries can create, search, update, and assign members to communities. Each member gets a unique code and a QR code. Duplicate detection is in place.

### 6.1 Member and Community Prisma models
- Add full `Member` model: all fields from data model doc
- Add `MemberStatus` enum: `CREATED`, `ACTIVATED`, `SUSPENDED`, `DECEASED`
- Add `Community` model: `id`, `name`, `description`, `presidentMemberId`, `createdAt`, `updatedAt`
- Add `UserMemberLink` model: `id`, `userId`, `memberId`, `verifiedAt`, `createdAt`
- Run migration

### 6.2 Member CRUD endpoints
- `POST /members` — create member (requires `member.create`)
- `GET /members` — list members with search (name, code, community) and pagination (requires `member.read`)
- `GET /members/:code` — get member by public member code (requires `member.read`)
- `PATCH /members/:code` — update basic member fields (requires `member.update`)
- Validate all inputs with DTOs
- Never expose internal `id` in responses; use `memberCode` as public identifier

### 6.3 Member code generation
- Generate a human-readable unique code: e.g. `SHK-2026-00142` (prefix + year + padded sequence)
- Ensure uniqueness with a DB unique constraint
- Generate code automatically on member creation

### 6.4 QR code generation
- Install `qrcode` library
- Generate QR code encoding the `memberCode`
- Return QR code as a base64 PNG on `GET /members/:code/qr-code`
- Optionally store generated QR code in R2 (Phase 7)

### 6.5 Community CRUD
- `POST /communities` — create community (requires `community.create`)
- `GET /communities` — list communities
- `GET /communities/:id` — get community with member count
- `PATCH /communities/:id` — update community (requires `community.update`)
- `POST /communities/:id/members` — assign member to community

### 6.6 Duplicate detection
- On member creation, check for potential duplicates by: `firstName + lastName + dateOfBirth` or `phone` or `email`
- Return a warning (not a hard block) if a likely duplicate is found
- Log the duplicate check result in audit metadata

### 6.7 Audit integration
- Audit `MEMBER.CREATED` on creation
- Audit `MEMBER.UPDATED` on every patch (include changed fields in metadata)

---

## Phase 7: File Storage (R2)

**Deliverable:** Backend can upload files to Cloudflare R2, generate signed URLs for authorized access, and track all file metadata and access events in PostgreSQL.

### 7.1 R2 client setup
- Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (R2 is S3-compatible)
- Create `R2Service` configured with `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- Verify connection on app startup

### 7.2 Object key generation
- Generate object keys using UUID + timestamp + domain prefix
- Format: `members/photos/2026/05/<uuid>.jpg`
- Never include names, phone numbers, member codes, or any personal data in object keys

### 7.3 File upload service
- Create `StorageService.upload({ file, folder, mimeType, uploadedByUserId })`
- Validate MIME type against allowed types (`image/jpeg`, `image/png`, `application/pdf`)
- Validate file size against `MAX_FILE_SIZE_MB`
- Compute SHA-256 checksum before upload
- Upload to R2 using `PutObjectCommand`
- Return `{ r2ObjectKey, bucket, checksum, fileSize, mimeType }`

### 7.4 Document Prisma model
- Add full `Document` model from data model doc
- Add enums: `DocumentType` (`MEMBER_PHOTO`, `MEMBER_CARD`, `MARRIAGE_REQUEST_PDF`, `MEDICAL_REFERRAL_PDF`, `SUPPORTING_DOCUMENT`), `DocumentStatus` (`ACTIVE`, `DELETED`), `DocumentVisibility` (`PRIVATE`, `RESTRICTED`)
- Run migration

### 7.5 Signed URL generation
- Create `StorageService.getSignedUrl(r2ObjectKey, expiresInSeconds)`
- Use `GetObjectCommand` + `getSignedUrl` from `@aws-sdk/s3-request-presigner`
- Default expiration: 300 seconds (`R2_SIGNED_URL_EXPIRES_IN`)
- Call only after RBAC and ownership checks have passed

### 7.6 FileAccessLog Prisma model
- Add `FileAccessLog` model: `id`, `documentId`, `actorUserId`, `action`, `ipAddress`, `userAgent`, `accessedAt`, `metadata`
- Add `FileAccessAction` enum: `VIEW`, `DOWNLOAD`, `UPLOAD`, `DELETE`, `GENERATE`
- Run migration

### 7.7 Document access endpoints
- `POST /documents/upload` — upload a supporting document (requires auth + ownership)
- `GET /documents/:code` — get document metadata (requires auth + RBAC)
- `GET /documents/:code/url` — get signed download URL (requires auth + RBAC + ownership)
- Log every access in `FileAccessLog`
- Never return raw R2 object keys in public responses

---

## Phase 8: Member Photo Upload

**Deliverable:** Secretaries and admins can upload a profile photo for a member. Members can view their own photo via a signed URL.

### 8.1 Photo upload endpoint
- `POST /members/:code/photo` — upload member photo (requires `member.update`)
- Accepts `multipart/form-data`
- Validate file: JPEG or PNG only, max 5 MB
- Use `StorageService.upload` with folder `members/photos/`
- Create `Document` record with `documentType: MEMBER_PHOTO`, linked to the member
- Update `Member.photoDocumentId` (or equivalent reference)
- Log `FILE.UPLOADED` in audit

### 8.2 Photo retrieval
- `GET /members/:code/photo` — returns a signed URL for the member's photo
- Members can only access their own photo
- Admins and secretaries can access any member's photo
- Log `FILE.VIEWED` in `FileAccessLog`

---

## Phase 9: Member Activation

**Deliverable:** A church member can activate their account using their member code, verify their identity via email OTP, set a password, and log in. Their user account is linked to their official member profile.

### 9.1 Enter member code endpoint
- `POST /auth/activate/start` — accepts `{ memberCode }`
- Verify member exists and has status `CREATED`
- Verify member has a registered email address
- Return masked email (e.g. `j***@example.com`) to confirm identity without revealing full email
- Return generic error if member not found (avoid enumeration)

### 9.2 Request OTP
- `POST /auth/activate/request-otp` — accepts `{ memberCode }`
- Call `VerificationService.startVerification(email, EMAIL, MEMBER_ACTIVATION)`
- Apply rate limiting and cooldown
- Return French success message: `"Un code de vérification vous a été envoyé par email."`

### 9.3 Verify OTP and create account
- `POST /auth/activate/verify` — accepts `{ memberCode, code, password }`
- Call `VerificationService.verifyCode(email, EMAIL, code, MEMBER_ACTIVATION)`
- On success: create `User` record with hashed password and role `MEMBER`
- Create `UserMemberLink` with `verifiedAt`
- Update `Member.status` to `ACTIVATED`
- Audit `MEMBER.ACTIVATED`
- Return JWT access token and refresh token (user is now logged in)

### 9.4 Prevent re-activation
- Reject activation if `Member.status` is already `ACTIVATED`
- Reject if a `UserMemberLink` already exists for this member

---

## Phase 10: Marriage Workflow

**Deliverable:** Members can submit marriage requests. Pastors can review, classify, change status, and add notes. The full status machine is enforced by the backend.

### 10.1 MarriageRequest Prisma model
- Add full `MarriageRequest` model from data model doc
- Add `MarriageRequestStatus` enum: `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `WAITING_APPOINTMENT`, `COUNSELING`, `MEDICAL_REFERRAL`, `WAITING_RESULTS`, `APPROVED`, `REJECTED`, `COMPLETED`
- Add `MarriageClassification` enum: `GREEN`, `ORANGE`, `RED`
- Run migration

### 10.2 Marriage request code generation
- Generate unique code: e.g. `MAR-2026-00031`
- Assign automatically on creation

### 10.3 Create and submit request
- `POST /marriage-requests` — create draft (requires `marriage.create`, MEMBER role)
- Prefill form with authenticated member's data
- `POST /marriage-requests/:code/submit` — change status from `DRAFT` to `SUBMITTED`
- Validate required fields before allowing submission
- Audit `MARRIAGE.SUBMITTED`

### 10.4 Pastor review endpoints
- `GET /marriage-requests` — list requests (PASTOR sees all; MEMBER sees own only)
- `GET /marriage-requests/:code` — get request detail
- `PATCH /marriage-requests/:code` — update pastoral notes (requires `marriage.review`)
- `PATCH /marriage-requests/:code/status` — change workflow status (requires `marriage.review`)
- `PATCH /marriage-requests/:code/classification` — set GREEN / ORANGE / RED (requires `marriage.classify`)
- Audit `MARRIAGE.REVIEWED` and `MARRIAGE.CLASSIFIED` on changes

### 10.5 Status transition validation
- Enforce allowed transitions (e.g. only `SUBMITTED → UNDER_REVIEW`, not `DRAFT → APPROVED`)
- Throw `BadRequestException` with French message on invalid transition
- Define transition map as a constant

---

## Phase 11: Documents & PDF Generation

**Deliverable:** The system can generate a marriage request PDF and a medical referral PDF, store them in R2, and return a signed URL for download.

### 11.1 PDF generation library
- Install `@react-pdf/renderer` (frontend-driven) or `pdfkit` / `puppeteer` (backend-driven)
- Recommend backend-driven PDF generation for security and consistency
- Create `PdfService` with `generateMarriageRequestPdf(requestCode)` and `generateMedicalReferralPdf(requestCode)`

### 11.2 Marriage request PDF
- `POST /marriage-requests/:code/generate-pdf` — requires `document.generate`
- Fetch marriage request and member data
- Generate PDF with: member info, spouse info, intended date, request code, church header
- Upload to R2 in `marriage/requests/` folder
- Create `Document` record with `documentType: MARRIAGE_REQUEST_PDF`
- Audit `DOCUMENT.GENERATED`
- Return signed URL for immediate download

### 11.3 Medical referral PDF
- `POST /marriage-requests/:code/generate-medical-referral` — requires `document.generate`, only allowed when classification is `GREEN`
- Generate PDF with: couple info, pastor name, referral date, church stamp area
- Upload to R2 in `marriage/referrals/` folder
- Create `Document` record with `documentType: MEDICAL_REFERRAL_PDF`
- Audit `DOCUMENT.GENERATED`
- Return signed URL

### 11.4 Document listing
- `GET /documents` — list documents for authenticated user (members see own; admins/pastors filtered by RBAC)
- `GET /documents/:code/url` — get fresh signed URL (validates ownership, logs access)

---

## Phase 12: Appointments

**Deliverable:** Members and secretaries can book appointments. Pastors can manage their schedule. Email reminders are sent automatically.

### 12.1 Appointment Prisma model
- Add full `Appointment` model from data model doc
- Add `AppointmentStatus` enum: `SCHEDULED`, `RESCHEDULED`, `CANCELLED`, `COMPLETED`
- Add `AppointmentType` enum: `PASTORAL_COUNSELING`, `MARRIAGE_REVIEW`, `GENERAL`
- Run migration

### 12.2 Book and schedule appointments
- `POST /appointments` — create appointment (requires `appointment.create`)
- Validate: `scheduledAt` is in the future, pastor is available (no conflict check for MVP)
- Link to a `marriageRequestId` if applicable
- Audit `APPOINTMENT.CREATED`

### 12.3 Manage appointments
- `GET /appointments` — list (members see own; pastors see assigned; admins see all)
- `GET /appointments/:id` — get detail
- `PATCH /appointments/:id` — reschedule (requires `appointment.manage`)
- `POST /appointments/:id/cancel` — cancel with reason

### 12.4 Email reminders
- Use a BullMQ job scheduled for 24h and 1h before appointment
- Send email via Twilio SendGrid or SMTP (`NotificationService`)
- Create `Notification` record for each sent notification
- Log send status and any errors (never expose provider errors to client)

---

## Phase 13: Frontend & Dashboard

**Deliverable:** A complete web portal for admins, pastors, secretaries, and members. All UI in French. Dashboard displays live stats.

### 13.1 Authentication UI
- Login page (`/connexion`)
- Member activation flow (`/activation`): enter code → OTP → set password
- Password reset flow (`/reinitialisation`)
- Protected route wrapper using session/JWT

### 13.2 Admin portal — Member management
- Member list page with search and filters (`/fideles`)
- Member detail page (`/fideles/:code`)
- Create member form (`/fideles/nouveau`)
- Edit member form
- Photo upload UI
- Community assignment UI

### 13.3 Admin portal — Community management
- Community list (`/communautes`)
- Create / edit community
- Community member list

### 13.4 Pastor portal — Marriage dossiers
- Marriage request list with status and classification filters (`/dossiers-matrimoniaux`)
- Dossier detail page with full timeline
- Pastoral notes form
- Classification selector (GREEN / ORANGE / RED)
- Status change action buttons
- Generate PDF and referral buttons

### 13.5 Member portal
- Member profile page (`/mon-profil`)
- Submit marriage request (`/dossiers-matrimoniaux/nouveau`)
- View own dossier status and documents
- Book appointment (`/rendez-vous/nouveau`)

### 13.6 Appointments UI
- Appointment list (`/rendez-vous`)
- Book appointment form
- Cancel / reschedule actions

### 13.7 Dashboard
- `GET /dashboard/summary`: total members, pending requests, green/orange/red counts, upcoming appointments
- `GET /dashboard/marriage-stats`: requests by status over time
- `GET /dashboard/appointment-stats`: appointments by week
- Build dashboard page (`/tableau-de-bord`) using shadcn/ui cards and charts
- Separate views for CHURCH_ADMIN and PASTOR roles

---

## Phase 14: Testing & Hardening

**Deliverable:** Core business logic is covered by tests. The app handles edge cases gracefully. All French error messages are consistent.

### 14.1 Unit tests (backend)
- Test `HashingService`
- Test `VerificationService` (mock Twilio)
- Test member code generation (uniqueness, format)
- Test marriage request status transition validation
- Test RBAC permission resolution

### 14.2 Integration tests (backend)
- Auth flow: login → refresh → logout
- Member activation flow: start → request OTP → verify → login
- Marriage request flow: create → submit → review → classify
- File upload and signed URL flow

### 14.3 E2E tests (optional for MVP)
- Member activation happy path
- Marriage request submission and pastor review
- Login and protected route access

### 14.4 Error handling audit
- Ensure all endpoints return consistent error shape: `{ statusCode, message, error }`
- Ensure all user-facing messages are in French
- Ensure no stack traces or internal errors leak to frontend responses
- Ensure all 401 and 403 responses use French messages

### 14.5 Security hardening
- Add HTTP security headers (`helmet`)
- Add CORS configuration
- Review all endpoints for missing auth guards
- Verify no internal IDs are exposed in any response
- Verify all file access goes through signed URL flow
- Run a manual review against `docs/10-security-requirements.md`
