# MVP Scope

## Included in MVP

### Authentication
- Login
- Logout
- Password reset
- OTP verification
- Role-based access control

### Member Registry
- Create member
- Edit member
- Search member
- Upload member photo
- Generate unique member code
- Generate QR code
- Assign community
- Manage member status

### Member Activation
- Member enters unique code
- System sends OTP
- Member verifies OTP
- Member creates account
- User account is linked to official member profile

### Communities
- Create community
- Assign community president
- Assign members to communities

### Marriage Requests
- Start request using member code
- Prefill member data
- Submit marriage project form
- Generate unique marriage request code
- Allow printing/downloading PDF
- Track status

### Pastor Review
- View submitted marriage requests
- Add pastoral notes
- Classify case as green, orange, or red
- Change workflow status
- Generate medical referral document if green

### Appointments
- Book appointment
- Schedule appointment
- Reschedule appointment
- Cancel appointment
- Appointment reminders

### Documents
- Generate marriage request PDF
- Generate medical referral PDF
- Store uploaded documents

### Verification and Notifications
#### Included in MVP
- Twilio email verification for member account activation
- verification retry limits
- verification attempt limits
- verification audit logs
- email notifications for appointment and marriage request updates

#### Designed for Later
- Twilio SMS verification
- Twilio WhatsApp verification
- SMS appointment reminders
- WhatsApp appointment reminders
- WhatsApp marriage workflow updates

### Dashboard
- Total members
- Pending marriage requests
- Green/orange/red cases
- Upcoming appointments

### File Storage

Use Cloudflare R2.

The MVP must support:
- member photo upload
- document upload
- generated PDF storage
- secure document download using signed URLs
- document metadata tracking
- file access audit logs

### Security Included in MVP

The MVP must include:
- RBAC
- JWT authentication
- refresh token rotation
- Twilio OTP verification
- OTP rate limiting
- secure password hashing
- audit logging
- private file storage
- signed URL file access
- file type validation
- file size limits
- soft deletes

## Excluded from MVP
- Hospital portal
- Medical result upload
- WhatsApp integration
- Mobile app
- Payments
- Advanced analytics
- AI
- Offline mode
- Multi-denomination SaaS features
