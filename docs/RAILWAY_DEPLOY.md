# Railway Deployment

This project deploys to Railway as four services:

- `backend` from `apps/backend/Dockerfile`
- `frontend` from `apps/frontend/Dockerfile`
- Railway PostgreSQL
- Railway Redis

Keep the Railway service root directory at `/` for both app services. The Dockerfiles depend on the root `package-lock.json`.

## 1. Create Services

1. Create a new Railway project.
2. Add PostgreSQL from Railway's database templates.
3. Add Redis from Railway's database templates.
4. Add a GitHub repo service for the backend.
5. Add a second GitHub repo service for the frontend.

## 2. Backend Settings

Use:

- Config file path: `/railway.backend.json`
- Root directory: `/`
- Public domain: enabled

Variables:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_ACCESS_SECRET=<generate-a-long-random-secret>
JWT_REFRESH_SECRET=<generate-another-long-random-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
APP_NAME=Plateforme Eglise
APP_URL=https://<frontend-domain>
API_URL=https://<backend-domain>/api/v1
OTP_DEFAULT_CHANNEL=EMAIL
OTP_ENABLED_CHANNELS=EMAIL
OTP_EXPIRES_IN_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf
```

Optional until file uploads / OTP providers are configured:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
R2_PUBLIC_URL=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
SMTP_FROM_ADDRESS=
```

## 3. Frontend Settings

Use:

- Config file path: `/railway.frontend.json`
- Root directory: `/`
- Public domain: enabled

Variables:

```env
NEXT_PUBLIC_API_URL=https://<backend-domain>/api/v1
```

Set this before the frontend build. Next.js bakes public env vars into the browser bundle.

## 4. Deploy Order

1. Deploy PostgreSQL and Redis.
2. Deploy the backend.
3. Copy the backend public domain.
4. Set `NEXT_PUBLIC_API_URL` on the frontend.
5. Deploy the frontend.
6. Copy the frontend public domain.
7. Set `APP_URL` on the backend to the frontend domain.
8. Redeploy the backend.

## 5. Optional Test Data

After backend is deployed and migrations have run, open a Railway shell for the backend and run:

```bash
npx prisma db seed --schema=apps/backend/prisma/schema.prisma
```

Seeded test accounts all use:

```text
TestPass123!
```

Examples:

```text
admin@shiddukim.test
pastor@shiddukim.test
member@shiddukim.test
```

## 6. Smoke Checks

Backend:

```text
https://<backend-domain>/api/v1/health
```

Frontend:

```text
https://<frontend-domain>/connexion
```
