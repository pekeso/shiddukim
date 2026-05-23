# Security Requirements

## Security Context

The platform handles:
- official church member identity data
- pastoral case data
- marriage request data
- uploaded personal documents
- generated church documents
- future medical exam result files

Security must be treated as a core product requirement, not an afterthought.

## Authentication Security

- Use JWT access tokens with short expiration.
- Use refresh token rotation.
- Hash passwords using Argon2 or bcrypt.
- Store refresh tokens securely.
- Invalidate refresh tokens on logout.
- Add rate limiting on login and OTP endpoints.

## OTP Security

Use Twilio for OTP verification.

Rules:
- OTP expires after a short period.
- OTP attempts are limited.
- OTP resend is rate limited.
- OTP verification events are audited.
- Do not store OTP values in plain text.
- Prefer Twilio Verify for OTP lifecycle management.

## Authorization Security

Use RBAC with granular permissions.

Examples:
- member.create
- member.read
- member.update
- marriage.review
- marriage.classify
- document.generate
- document.view
- audit.view

Members can only access their own profile and documents.

Pastors can access marriage cases assigned to them or allowed by their role.

Secretaries can create member records but cannot view sensitive pastoral notes unless permitted.

## File Security

Use Cloudflare R2 private bucket.

Rules:
- no public bucket access
- no permanent public file URLs
- generate temporary signed URLs only after authorization
- signed URLs expire quickly
- backend validates every file access request
- object keys must be random and non-guessable
- object keys must not contain names, phone numbers, or member codes
- store file metadata in PostgreSQL
- log every upload, download, view, and delete action

## File Upload Validation

Validate:
- file MIME type
- file extension
- file size
- file checksum
- upload purpose
- authenticated user permission

Allowed MVP file types:
- JPEG
- PNG
- PDF

## Audit Logging

Audit logs must capture:
- actor user ID
- action
- entity type
- entity ID
- IP address
- user agent
- timestamp
- metadata

Audit these events:
- login
- failed login
- OTP requested
- OTP verified
- member created
- member updated
- marriage request submitted
- marriage classification changed
- document generated
- file uploaded
- file downloaded
- sensitive file viewed
- appointment created
- role changed

## Data Protection

- Use HTTPS in all environments except isolated local development.
- Do not expose internal database IDs in public responses.
- Use public codes for members, requests, and documents.
- Soft delete important records.
- Protect backups.
- Restrict production database access.
- Use environment variables for secrets.
- Never commit secrets to Git.

## Medical Data Future-Proofing

The MVP does not include hospital medical results, but the design must prepare for them.

Future medical documents must:
- have stricter permissions
- be visible only to authorized pastoral/medical roles
- be separately classified as sensitive medical files
- have mandatory access logging