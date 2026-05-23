# Project: Plateforme de Gestion des Fidèles et Dossiers Matrimoniaux

## Product Language
The application language is French.

## Project Type
Church management platform MVP.

## Architecture
Use a modular monolith architecture.

## Backend
NestJS + TypeScript + PostgreSQL + Prisma + Redis + CloudFlare R2.

## Frontend
Next.js + TypeScript + Tailwind CSS + shadcn/ui.

## Mobile
Flutter will be added later. For MVP, start with web admin and member web portal.

## Core Principle
Separate User Account from Church Member Record.

A user account is used for login.
A church member record is the official church identity.

## Main Domains
- Auth
- Users
- Members
- Communities
- Marriage Requests
- Appointments
- Documents
- Notifications
- Audit Logs
- Dashboard

## Important Rules
- Never expose database IDs publicly.
- Use public unique codes for members and marriage requests.
- All sensitive actions must be audited.
- Use RBAC permissions.
- Members cannot edit official church information such as baptism data.
- Medical documents must be stored privately.
- The UI must be in French.

## OTP / Verification Provider

Use Twilio for member verification.

For the MVP, use Twilio email verification.

The verification system must be designed to support multiple channels:

- EMAIL: enabled in MVP
- SMS: planned later
- WHATSAPP: planned later

Do not hardcode email-only verification logic.

Create a generic verification abstraction that supports:
- provider: TWILIO
- channel: EMAIL | SMS | WHATSAPP
- purpose: MEMBER_ACTIVATION | PASSWORD_RESET | SENSITIVE_ACTION
- recipient: email address or phone number
- provider verification ID/status when applicable

MVP rules:
- Use email verification first.
- SMS and WhatsApp must be easy to add later.
- Verification codes must expire.
- Verification attempts must be limited.
- Resend must be rate-limited.
- Verification events must be audited.
- Never log verification codes.
- Never store verification codes in plain text.

## File Storage

Use Cloudflare R2 for all file storage.

Do not use MinIO.

Files stored in R2 include:
- member photos
- generated PDFs
- uploaded supporting documents
- medical referral documents
- future medical exam results

All files must be private by default.

## Data Security Requirements

The platform will handle sensitive church, pastoral, identity, and future medical data.

Security rules:
- use HTTPS only
- never expose database IDs publicly
- never expose raw R2 object keys publicly
- generate signed temporary URLs for file access
- validate file type and size before upload
- store file metadata in the database
- log every sensitive file access
- log every document generation
- log every status/classification change
- restrict files using RBAC permissions
- members can only access their own documents
- pastors can only access files related to cases they are authorized to review
- hospital users, when added later, must only access assigned medical upload workflows

## Important Storage Rule

Cloudflare R2 buckets must not be public.

Use private buckets and signed URLs only.