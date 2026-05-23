# System Design

## Architecture Style
Modular monolith.

## Backend Modules
- AuthModule
- UsersModule
- MembersModule
- CommunitiesModule
- MarriageModule
- AppointmentsModule
- DocumentsModule
- NotificationsModule
- AuditModule
- DashboardModule

## Data Stores
- PostgreSQL for relational data
- Redis for OTP, rate limiting, queues, sessions, and cache
- Cloudflare R2 for private object storage

## Verification Provider

Use Twilio for verification.

MVP channel:
- Email verification

Future channels:
- SMS verification
- WhatsApp verification

The verification module must be channel-based and provider-based.

Do not implement member activation in a way that only works for email.

Expected abstraction:

VerificationService
- startVerification(recipient, channel, purpose)
- verifyCode(recipient, channel, code, purpose)

Supported channels:
- EMAIL
- SMS
- WHATSAPP

MVP enabled channel:
- EMAIL

## File Storage Design

All uploaded and generated files are stored in Cloudflare R2.

File categories:
- member photos
- generated membership cards
- marriage request PDFs
- medical referral PDFs
- uploaded supporting documents
- future medical exam result files

R2 security rules:
- private bucket only
- no public bucket access
- signed temporary URLs for downloads/views
- object keys must not reveal personal information
- file metadata stored in PostgreSQL
- access controlled through backend API
- all access audited

## Core Rule
User accounts and church member records must be separate.

The backend must be the only layer that decides whether a user can access a file.

Frontend must never directly construct R2 URLs.

## Internal Event Examples
- MemberCreated
- MemberActivated
- MarriageRequestSubmitted
- MarriageRequestReviewed
- AppointmentCreated
- DocumentGenerated
- FileUploaded
- FileDownloaded
- SensitiveFileAccessed


## API Style
Use REST API with `/api/v1`.

## Security
- JWT access token
- Refresh token rotation
- Password hashing
- Rate limiting
- RBAC
- Audit logs
- Private file storage