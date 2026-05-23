# Phase 5 Prompt — Verification Service (OTP)

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
- Never log or store OTP codes in plain text
- Use generic error messages to avoid account enumeration

## Completed Phases

### Phase 1 — Infrastructure & Monorepo ✅
### Phase 2 — Authentication Foundation ✅
### Phase 3 — RBAC & Rate Limiting ✅
### Phase 4 — Audit Logging ✅
- `AuditLog` Prisma model
- `AuditService` (non-blocking, never crashes callers)
- Audit action constants organized by domain
- `GET /audit-logs` restricted endpoint
- See `docs/PROGRESS.md` for actual file paths

## Reference Docs to Read First
- `docs/09-development-plan.md` — Phase 5 sub-tasks
- `docs/12-twilio-otp-design.md` — full Twilio OTP design and French messages
- `docs/05-data-model.md` — OtpVerification model
- `docs/10-security-requirements.md` — OTP security rules
- `docs/PROGRESS.md` — all conventions so far

## Current Phase: 5 — Verification Service (OTP)

**Deliverable:** The backend can send an email verification code via Twilio and verify it. The service is channel-based and provider-based so SMS and WhatsApp can be added later without changing any domain logic.

### Sub-tasks
1. Define enums: `VerificationChannel` (`EMAIL`, `SMS`, `WHATSAPP`), `VerificationPurpose` (`MEMBER_ACTIVATION`, `PASSWORD_RESET`, `LOGIN_VERIFICATION`, `SENSITIVE_ACTION`), `VerificationProvider` (`TWILIO`)
2. Define `VerificationService` interface: `startVerification(recipient, channel, purpose)` and `verifyCode(recipient, channel, code, purpose)`
3. Add `OtpVerification` Prisma model: `id`, `targetType`, `targetValue`, `provider`, `providerVerificationId`, `channel`, `purpose`, `status`, `attempts`, `expiresAt`, `verifiedAt`, `createdAt`
4. Add `OtpStatus` enum: `PENDING`, `VERIFIED`, `EXPIRED`, `FAILED`
5. Run migration
6. Create `TwilioVerificationProvider` implementing the interface
7. `startVerification`: call Twilio Verify `verifications.create({ to, channel })` — store providerVerificationId
8. `verifyCode`: call Twilio Verify `verificationChecks.create({ to, code })` — update OtpVerification status
9. Reject `startVerification` if resend cooldown has not expired (`OTP_RESEND_COOLDOWN_SECONDS` from env)
10. Reject `verifyCode` if `attempts >= OTP_MAX_ATTEMPTS`; increment `attempts` on every failure
11. Mark as `EXPIRED` when `expiresAt` is in the past
12. Audit `AUTH.OTP_REQUESTED` on every `startVerification` and `AUTH.OTP_VERIFIED` on success
13. Never log or expose OTP codes; use generic French error messages from `docs/12-twilio-otp-design.md`

## French Messages (from docs/12-twilio-otp-design.md)
- Sent: `"Un code de vérification vous a été envoyé par email."`
- Invalid/expired: `"Le code de vérification est invalide ou expiré."`
- Too many attempts: `"Trop de tentatives. Veuillez réessayer plus tard."`
- No email: `"Votre dossier ne contient pas encore d'adresse email valide. Veuillez contacter le secrétariat de l'église."`

## Git Workflow for This Phase
- Branch: `feature/phase-05-verification` from `develop`
- Commit after: enums/interface, Prisma model, Twilio provider, rate limiting, audit wiring
- Open a PR from `feature/phase-05-verification` → `develop` when the deliverable is met

## Start With
Read `docs/PROGRESS.md` to understand current project state.
Then read `docs/12-twilio-otp-design.md` in full — it contains the complete design.
Start with the enums and interface, then the Prisma model, then the Twilio provider.
At the end, merge the PR, then update `docs/PROGRESS.md` Phase 5 section with actual file paths created.
