# Phase 13 Prompt — Frontend & Dashboard

> Copy everything below the divider and paste it as your first message in a new conversation.

---

## Project

We are building **Shiddukim** — a church member management platform in French.
It handles member registration, marriage requests, pastoral review, appointments, and document generation.
The UI and all user-facing messages must be in French.

## Stack
- Backend: NestJS + TypeScript + Prisma + PostgreSQL + Redis
- Frontend: Next.js + TypeScript + Tailwind CSS + shadcn/ui (App Router)
- Storage: Cloudflare R2 (private bucket, signed URLs only)
- Architecture: Modular monolith
- API: REST, base path `/api/v1`

## Key Rules (always apply)
- All UI labels, messages, navigation, and forms must be in French
- Frontend never accesses R2 directly — use backend-provided signed URLs
- Never display internal database IDs in the UI — use `memberCode`, `requestCode`, `documentCode`
- Route and link labels must match the French menu names from `docs/07-ui-guidelines.md`

## Brand Colors (from docs/07-ui-guidelines.md)
- Deep Blue: `#003B8E`
- Royal Blue: `#0057B8`
- Gold: `#F2B705`
- White: `#FFFFFF`
- Light Gray: `#F5F7FA`
- Dark Text: `#1F2937`
- Danger Red: `#B91C1C`
- Success Green: `#15803D`
- Warning Orange: `#F97316`

## French Navigation Labels
- Tableau de bord, Fidèles, Communautés, Dossiers matrimoniaux, Rendez-vous, Documents, Utilisateurs, Paramètres

## Completed Phases (Backend)

### Phases 1–12 are all complete ✅
The backend exposes the following APIs (base: `/api/v1`):
- Auth: `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh-token`
- Activation: `POST /auth/activate/start`, `/request-otp`, `/verify`
- Members: `GET/POST /members`, `GET/PATCH /members/:memberCode`, `POST /members/:memberCode/photo`, `GET /members/:memberCode/photo`
- Communities: `GET/POST /communities`, `GET/PATCH /communities/:id`
- Marriage: `GET/POST /marriage-requests`, `GET/PATCH /marriage-requests/:requestCode`, `/submit`, `/status`, `/classification`, `/generate-pdf`, `/generate-medical-referral`
- Appointments: `GET/POST /appointments`, `GET/PATCH /appointments/:id`, `POST /appointments/:id/cancel`
- Documents: `GET /documents`, `GET /documents/:documentCode`, `GET /documents/:documentCode/url`
- Dashboard: `GET /dashboard/summary`, `/marriage-stats`, `/appointment-stats`
- See `docs/PROGRESS.md` for actual backend file paths and conventions

## Reference Docs to Read First
- `docs/09-development-plan.md` — Phase 13 sub-tasks
- `docs/07-ui-guidelines.md` — brand colors, style, French labels
- `docs/08-api-contracts.md` — full API contract
- `docs/04-roles-permissions.md` — which roles see which pages
- `docs/PROGRESS.md` — all conventions so far

## Current Phase: 13 — Frontend & Dashboard

**Deliverable:** A complete web portal for admins, pastors, secretaries, and members. All UI in French. Dashboard displays live stats.

### Sub-tasks

#### Authentication UI
1. Login page `/connexion` — email + password form, JWT handling, redirect by role
2. Member activation flow `/activation` — 3 steps: enter code → enter OTP → set password
3. Protected route wrapper: redirect to `/connexion` if not authenticated
4. Role-based redirect after login (ADMIN/SECRETARY → `/tableau-de-bord`, MEMBER → `/mon-profil`)

#### Admin Portal — Members
5. Member list page `/fideles` — table with search (name, code, community), pagination
6. Member detail page `/fideles/:memberCode` — all fields, photo, community, status badge
7. Create member form `/fideles/nouveau` — all required fields, photo upload
8. Edit member modal — basic fields only (baptism data read-only for members)

#### Admin Portal — Communities
9. Community list `/communautes` — table with member count
10. Create / edit community modal

#### Pastor Portal — Marriage Dossiers
11. Dossier list `/dossiers-matrimoniaux` — filterable by status and classification (GREEN/ORANGE/RED badges)
12. Dossier detail page `/dossiers-matrimoniaux/:requestCode` — full data, timeline of status changes
13. Pastoral notes form — inline editing with save button
14. Classification selector — color-coded GREEN / ORANGE / RED buttons
15. Status change action buttons — only show valid next transitions
16. "Générer le PDF" and "Générer la référence médicale" buttons (referral only shown when GREEN)

#### Member Portal
17. Member profile page `/mon-profil` — own data, linked member record, own documents
18. Submit marriage request `/dossiers-matrimoniaux/nouveau` — prefilled with own data
19. View own dossier `/dossiers-matrimoniaux/:requestCode` — status timeline, download PDF

#### Appointments
20. Appointment list `/rendez-vous` — filterable by status
21. Book appointment form `/rendez-vous/nouveau`
22. Cancel / reschedule actions

#### Dashboard
23. Fetch `GET /dashboard/summary`: total members, pending requests, GREEN/ORANGE/RED counts, upcoming appointments
24. Fetch `GET /dashboard/marriage-stats` and `/appointment-stats` for charts
25. Build `/tableau-de-bord` with shadcn/ui cards and a chart library (e.g. Recharts)
26. Show different dashboard views for CHURCH_ADMIN vs PASTOR

## Git Workflow for This Phase
- Branch: `feature/phase-13-frontend` from `develop`
- Commit after each major section: auth UI, admin member pages, pastor dossier pages, member portal, dashboard
- Open a PR from `feature/phase-13-frontend` → `develop` when the deliverable is met

## Start With
Read `docs/PROGRESS.md` to understand backend API conventions and actual endpoint paths.
Then read `docs/07-ui-guidelines.md` for brand colors and French labels.
Start with the authentication flow (login + activation), then the protected layout with navigation, then the member list page.
At the end, merge the PR, then update `docs/PROGRESS.md` Phase 13 section with actual file paths created.
