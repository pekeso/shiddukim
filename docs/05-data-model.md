# Data Model Draft

## User
Authentication identity.

Fields:
- id
- email
- phone
- passwordHash
- status
- lastLoginAt
- createdAt
- updatedAt

## Member
Official church member record.

Fields:
- id
- memberCode
- firstName
- middleName
- lastName
- gender
- dateOfBirth
- placeOfBirth
- address
- phone
- email
- photoUrl
- communityId
- baptismDate
- baptizedBy
- status
- createdAt
- updatedAt

## UserMemberLink
Links app user account to official member record.

Fields:
- id
- userId
- memberId
- verifiedAt
- createdAt

## Community
Fields:
- id
- name
- description
- presidentMemberId
- createdAt
- updatedAt

## MarriageRequest
Fields:
- id
- requestCode
- memberId
- spouseFullName
- spousePhone
- spouseEmail
- intendedMarriageDate
- status
- classification
- pastorNotes
- submittedAt
- reviewedAt
- createdAt
- updatedAt

## Appointment
Fields:
- id
- memberId
- marriageRequestId
- pastorId
- appointmentType
- scheduledAt
- status
- notes
- createdAt
- updatedAt

## Document
Represents uploaded or generated files.

Fields:
- id
- documentCode
- ownerType
- ownerId
- documentType
- originalFileName
- storedFileName
- r2Bucket
- r2ObjectKey
- mimeType
- fileSize
- checksum
- visibility
- status
- uploadedByUserId
- generatedByUserId
- createdAt
- updatedAt
- deletedAt

Important:
- Do not store public URLs.
- Store only the R2 object key and metadata.
- Generate temporary signed URLs when authorized users need access.

## Notification
Fields:
- id
- recipientUserId
- channel
- provider
- providerMessageId
- subject
- message
- status
- errorMessage
- sentAt
- createdAt

Channels:
- SMS
- EMAIL
- WHATSAPP_FUTURE

Providers:
- TWILIO
- SMTP

## AuditLog
Fields:
- id
- actorUserId
- action
- entityType
- entityId
- metadata
- ipAddress
- userAgent
- createdAt

## FileAccessLog

Tracks every sensitive file access.

Fields:
- id
- documentId
- actorUserId
- action
- ipAddress
- userAgent
- accessedAt
- metadata

Actions:
- VIEW
- DOWNLOAD
- UPLOAD
- DELETE
- GENERATE

## OtpVerification

Fields:
- id
- targetType
- targetValue
- provider
- providerVerificationId
- status
- attempts
- expiresAt
- verifiedAt
- createdAt

Important:
If using Twilio Verify, do not store raw OTP codes.