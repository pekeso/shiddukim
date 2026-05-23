# Phase 1 Prompt — Infrastructure & Monorepo

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
None. This is the first phase.

## Reference Docs to Read First
- `docs/09-development-plan.md` — Phase 1 sub-tasks
- `docs/03-system-design.md` — architecture overview
- `CLAUDE.md` — project rules
- `docs/PROGRESS.md` — progress tracker (update this at the end of the phase)
- `.env.local` — environment variable template

## Current Phase: 1 — Infrastructure & Monorepo

**Deliverable:** Git repository is initialized with branching strategy and commit conventions. NestJS backend and Next.js frontend boot successfully. PostgreSQL and Redis are reachable from the backend. Prisma is connected and the first migration runs. Docker Compose brings up all four services cleanly.

## Git Workflow for This Phase
- Initialize the repo on `main`, then create and switch to `develop`
- Create branch `feature/phase-01-infrastructure` from `develop`
- Commit frequently using Conventional Commits: `chore:`, `feat:`, `docs:`
- Never commit `.env` files — only `.env.example` is committed
- Open a PR from `feature/phase-01-infrastructure` → `develop` when the deliverable is met

### Sub-tasks

#### Git & Repository
1. Run `git init` at the monorepo root
2. Create `.gitignore`: Node.js, NestJS, Next.js build artifacts, all `.env*` files except `.env.example`, `node_modules`, `dist`, `.next`, `coverage`
3. Create `.env.example` with all variable names from `.env.local` but no values — this is the only env file committed
4. Create `README.md` with project name and brief description
5. Run initial commit: `chore: initialize repository`
6. Create `develop` branch and switch to it
7. Create `feature/phase-01-infrastructure` branch
8. Install and configure `husky` + `commitlint` to enforce Conventional Commits (optional but recommended)
9. Install and configure `lint-staged` + `eslint` / `prettier` for pre-commit checks (optional but recommended)

#### Monorepo & Backend
10. Create monorepo root with `apps/backend` and `apps/frontend` folders
11. Add root `package.json` with workspace configuration and `.editorconfig`
12. Scaffold NestJS app in `apps/backend`
13. Install and configure `@nestjs/config` with env validation using `joi` or `zod`
14. Set up global API prefix `/api/v1`
15. Set up global `ValidationPipe` and exception filter for consistent error responses
16. Add health check endpoint `GET /api/v1/health`

#### Frontend
17. Scaffold Next.js app in `apps/frontend` using App Router
18. Install and configure Tailwind CSS and shadcn/ui
19. Define brand colors in Tailwind config: Deep Blue `#003B8E`, Royal Blue `#0057B8`, Gold `#F2B705`, Danger Red `#B91C1C`, Success Green `#15803D`, Warning Orange `#F97316`

#### Infrastructure
20. Complete `docker-compose.yaml` with postgres:16, redis:7, backend (port 4000), frontend (port 3000) — named volumes, `depends_on`, env vars via `.env`
21. Install Prisma in `apps/backend`, configure `DATABASE_URL`
22. Create initial `schema.prisma` with datasource and generator blocks
23. Add skeleton `User` and `Member` models (to be expanded in Phases 2 and 6)
24. Run first migration: `prisma migrate dev --name init`
25. Create `prisma/seed.ts` with a `SUPER_ADMIN` seed user

## Start With
Read `docs/09-development-plan.md` Phase 1, then `docs/PROGRESS.md`.
Start with Git init (sub-task 1) before touching any app code — commit after the `.gitignore` and `.env.example` are in place.
At the end, open a PR from `feature/phase-01-infrastructure` → `develop`, merge it, then update `docs/PROGRESS.md` with actual file paths created and decisions made.
