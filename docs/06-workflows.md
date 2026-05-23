# Workflows

## Member Registration Workflow

1. Secretary creates member record.
2. System checks for duplicates.
3. System generates member code.
4. System generates QR code.
5. Member status becomes CREATED.
6. Member can later activate account.

## Member Activation Workflow

1. Member opens app.
2. Member enters member code.
3. System verifies member exists.
4. System sends OTP to registered phone/email.
5. Member enters OTP.
6. Member creates password.
7. System creates user account.
8. System links user account to member profile.
9. Member status becomes ACTIVATED.

## Marriage Request Workflow

Statuses:
- DRAFT
- SUBMITTED
- UNDER_REVIEW
- WAITING_APPOINTMENT
- COUNSELING
- MEDICAL_REFERRAL
- WAITING_RESULTS
- APPROVED
- REJECTED
- COMPLETED

Classifications:
- GREEN
- ORANGE
- RED

Process:
1. Member logs in.
2. Member starts marriage request.
3. Form is prefilled with member data.
4. Member completes form.
5. System generates marriage request code.
6. Pastor reviews request.
7. Pastor classifies as green, orange, or red.
8. If green, pastor generates medical referral PDF.
9. Case continues based on later medical process.