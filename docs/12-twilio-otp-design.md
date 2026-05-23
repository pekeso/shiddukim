# Twilio Verification Design

## Provider

Use Twilio for member verification.

## MVP Channel

For the MVP, use email verification.

Enabled MVP channel:

- EMAIL

Future supported channels:

- SMS
- WHATSAPP

## Design Principle

The backend must not be tightly coupled to email-only verification.

Create a generic verification service that supports:

- provider
- channel
- purpose
- recipient
- verification status
- attempt tracking
- audit logging

## Verification Channels

### EMAIL

Used in MVP.

Primary use cases:
- member account activation
- password reset
- sensitive action confirmation later

### SMS

Planned later.

Primary use cases:
- member account activation
- login verification
- urgent appointment reminders

### WHATSAPP

Planned later.

Primary use cases:
- member activation
- appointment reminders
- marriage workflow updates

## Verification Purposes

Supported purposes:

- MEMBER_ACTIVATION
- PASSWORD_RESET
- LOGIN_VERIFICATION
- SENSITIVE_ACTION

MVP should implement:

- MEMBER_ACTIVATION
- PASSWORD_RESET if time allows

## Member Activation Flow

1. Member opens the app.
2. Member enters member code.
3. Backend finds the official member record.
4. Backend checks that the member exists and is eligible for activation.
5. Backend checks that the member has a registered email address.
6. Backend starts Twilio email verification.
7. Member receives the verification code by email.
8. Member enters the code in the app.
9. Backend verifies the code through Twilio.
10. Backend creates or activates the user account.
11. Backend links the user account to the official member profile.
12. Backend marks the member account as activated.
13. Backend records an audit log.

## Future SMS / WhatsApp Activation Flow

The same verification service should later support phone-based verification.

The only difference should be the channel:

- EMAIL uses member email address
- SMS uses member phone number
- WHATSAPP uses member WhatsApp number

The domain logic should remain the same.

## Security Rules

- Rate limit verification requests by member code, recipient, IP address, and user agent.
- Limit verification attempts.
- Add resend cooldown.
- Audit verification request and verification result events.
- Never log OTP codes.
- Never store OTP codes in plain text.
- Use generic error messages to avoid account enumeration.
- Do not reveal whether an email belongs to a registered member.
- Do not expose Twilio internal errors to the frontend.
- Store provider response metadata safely without secrets.

## Recommended French Messages

Verification sent:

"Un code de vérification vous a été envoyé par email."

Invalid or expired code:

"Le code de vérification est invalide ou expiré."

Too many attempts:

"Trop de tentatives. Veuillez réessayer plus tard."

No email on file:

"Votre dossier ne contient pas encore d’adresse email valide. Veuillez contacter le secrétariat de l’église."

Activation success:

"Votre compte a été activé avec succès."

Generic activation error:

"Impossible de finaliser l’activation du compte. Veuillez vérifier les informations fournies ou contacter le secrétariat."