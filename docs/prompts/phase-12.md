# Phase 12 Prompt — Appointments

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
- All sensitive actions must be audit-logged
- The UI and notification messages must be in French

## Completed Phases

### Phase 1 — Infrastructure & Monorepo ✅
### Phase 2 — Authentication Foundation ✅
### Phase 3 — RBAC & Rate Limiting ✅
### Phase 4 — Audit Logging ✅
### Phase 5 — Verification Service (OTP) ✅
### Phase 6 — Member Registry ✅
### Phase 7 — File Storage (R2) ✅
### Phase 8 — Member Photo Upload ✅
### Phase 9 — Member Activation ✅
### Phase 10 — Marriage Workflow ✅
### Phase 11 — Documents & PDF Generation ✅
- `PdfService` with marriage request and medical referral PDF generation
- PDFs stored in R2, returned as signed URLs
- See `docs/PROGRESS.md` for actual file paths, conventions, and PDF library chosen

## Reference Docs to Read First
- `docs/09-development-plan.md` — Phase 12 sub-tasks
- `docs/05-data-model.md` — Appointment and Notification models
- `docs/08-api-contracts.md` — appointment endpoints
- `docs/PROGRESS.md` — all conventions so far

## Current Phase: 12 — Appointments

**Deliverable:** Members and secretaries can book appointments. Pastors can view and manage their schedule. Email reminders are sent automatically before each appointment.

### Sub-tasks
1. Add full `Appointment` model to Prisma (all fields from data model doc)
2. Add `AppointmentStatus` enum: `SCHEDULED`, `RESCHEDULED`, `CANCELLED`, `COMPLETED`
3. Add `AppointmentType` enum: `PASTORAL_COUNSELING`, `MARRIAGE_REVIEW`, `GENERAL`
4. Add `Notification` model: `id`, `recipientUserId`, `channel`, `provider`, `providerMessageId`, `subject`, `message`, `status`, `errorMessage`, `sentAt`, `createdAt`
5. Run migration
6. `POST /appointments` — create appointment (requires `appointment.create`)
   - Validate: `scheduledAt` must be in the future
   - Optionally link to `marriageRequestId`
   - Audit `APPOINTMENT.CREATED`
7. `GET /appointments` — list (members see own; pastors see assigned; admins see all)
8. `GET /appointments/:id` — get detail
9. `PATCH /appointments/:id` — reschedule (requires `appointment.manage`); status → RESCHEDULED
10. `POST /appointments/:id/cancel` — cancel with reason; status → CANCELLED
11. Create `NotificationService` with `sendEmail({ to, subject, body, recipientUserId })`
    - Use SMTP (Nodemailer) for MVP; record in `Notification` table with status
    - Handle errors gracefully; never crash the main request if email fails
    - Store send errors in `Notification.errorMessage`
12. Schedule reminders using BullMQ:
    - On appointment creation, queue two jobs: 24h before and 1h before `scheduledAt`
    - Job calls `NotificationService.sendEmail` with French reminder message
    - Cancel queued jobs if appointment is cancelled or rescheduled
13. French reminder message example:
    - Subject: `"Rappel de rendez-vous — Plateforme Église"`
    - Body: `"Votre rendez-vous est prévu le [date] à [heure]. Veuillez vous présenter à l'heure."`

## Git Workflow for This Phase
- Branch: `feature/phase-12-appointments` from `develop`
- Commit after: Prisma migration, CRUD endpoints, NotificationService, BullMQ reminder jobs
- Open a PR from `feature/phase-12-appointments` → `develop` when the deliverable is met

## Start With
Read `docs/PROGRESS.md` to understand the current project state.
Then read `docs/05-data-model.md` Appointment and Notification sections.
Start with the Prisma migration, then CRUD endpoints, then `NotificationService`, then BullMQ jobs.
At the end, merge the PR, then update `docs/PROGRESS.md` Phase 12 section with actual file paths created.
