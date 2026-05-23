# Phase 9 Prompt — Member Activation

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
- Never expose database IDs publicly
- Use generic error messages — never reveal whether a member code exists or whether an email is registered
- Never log OTP codes
- The UI must be in French

## Completed Phases

### Phase 1 — Infrastructure & Monorepo ✅
### Phase 2 — Authentication Foundation ✅
- `User` model, `HashingService`, JWT + refresh token rotation
- `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh-token`

### Phase 3 — RBAC & Rate Limiting ✅
### Phase 4 — Audit Logging ✅
### Phase 5 — Verification Service (OTP) ✅
- `VerificationService` interface with `startVerification` and `verifyCode`
- `TwilioVerificationProvider` for EMAIL channel
- `OtpVerification` model with attempt tracking and cooldown

### Phase 6 — Member Registry ✅
- `Member` model with `MemberStatus` enum (`CREATED`, `ACTIVATED`, `SUSPENDED`, `DECEASED`)
- `UserMemberLink` model
- Member code format: `SHK-YYYY-NNNNN`

### Phase 7 — File Storage (R2) ✅
### Phase 8 — Member Photo Upload ✅
- See `docs/PROGRESS.md` for actual file paths and all conventions

## Reference Docs to Read First
- `docs/09-development-plan.md` — Phase 9 sub-tasks
- `docs/06-workflows.md` — Member Activation Workflow (step-by-step)
- `docs/12-twilio-otp-design.md` — Member Activation Flow and French messages
- `docs/PROGRESS.md` — all conventions so far

## Current Phase: 9 — Member Activation

**Deliverable:** A church member can activate their account by entering their member code, verifying their identity via email OTP, creating a password, and logging in. Their user account is linked to their official member profile.

### Sub-tasks
1. `POST /auth/activate/start` — accepts `{ memberCode }`
   - Mark route as `@Public()`
   - Find member by `memberCode`; return generic error if not found (no enumeration)
   - Reject if `member.status` is already `ACTIVATED`
   - Verify member has an email address; if not, return French message about contacting secretary
   - Return masked email (e.g. `j***@gmail.com`) to confirm identity
2. `POST /auth/activate/request-otp` — accepts `{ memberCode }`
   - Mark route as `@Public()`
   - Find member, resolve email
   - Call `VerificationService.startVerification(email, EMAIL, MEMBER_ACTIVATION)`
   - Respect rate limiting and resend cooldown from `VerificationService`
   - Audit `AUTH.OTP_REQUESTED`
   - Return French message: `"Un code de vérification vous a été envoyé par email."`
3. `POST /auth/activate/verify` — accepts `{ memberCode, code, password }`
   - Mark route as `@Public()`
   - Call `VerificationService.verifyCode(email, EMAIL, code, MEMBER_ACTIVATION)`
   - On success:
     - Create `User` with hashed password, role `MEMBER`, status `ACTIVE`
     - Create `UserMemberLink` with `verifiedAt = now()`
     - Update `Member.status` to `ACTIVATED`
     - Audit `MEMBER.ACTIVATED`
   - Return JWT access token and refresh token (user is immediately logged in)
   - On failure: return French message from `docs/12-twilio-otp-design.md`
4. Prevent double activation: reject if `UserMemberLink` already exists for this member
5. All three endpoints must be rate-limited (use existing throttler from Phase 3)

## French Messages (from docs/12-twilio-otp-design.md)
- Code sent: `"Un code de vérification vous a été envoyé par email."`
- Invalid/expired: `"Le code de vérification est invalide ou expiré."`
- Too many attempts: `"Trop de tentatives. Veuillez réessayer plus tard."`
- No email: `"Votre dossier ne contient pas encore d'adresse email valide. Veuillez contacter le secrétariat de l'église."`
- Already activated: `"Ce compte est déjà activé."`
- Success: `"Votre compte a été activé avec succès."`

## Git Workflow for This Phase
- Branch: `feature/phase-09-activation` from `develop`
- Commit after: start endpoint, request-otp endpoint, verify endpoint + user creation
- Open a PR from `feature/phase-09-activation` → `develop` when the deliverable is met

## Start With
Read `docs/PROGRESS.md` to understand the `VerificationService` API and `UserMemberLink` model from previous phases.
Then read `docs/06-workflows.md` Member Activation section and `docs/12-twilio-otp-design.md`.
Start with `POST /auth/activate/start`, then request-otp, then verify.
At the end, merge the PR, then update `docs/PROGRESS.md` Phase 9 section with actual file paths created.
