# API Contracts

Base URL: /api/v1

## Auth
POST /auth/login
POST /auth/logout
POST /auth/request-otp
POST /auth/verify-otp
POST /auth/activate-member
POST /auth/refresh-token

## Members
GET /members
POST /members
GET /members/:id
PATCH /members/:id
GET /members/code/:memberCode
POST /members/:id/photo
POST /members/:id/generate-card

## Communities
GET /communities
POST /communities
GET /communities/:id
PATCH /communities/:id

## Marriage Requests
GET /marriage-requests
POST /marriage-requests
GET /marriage-requests/:id
PATCH /marriage-requests/:id
PATCH /marriage-requests/:id/status
PATCH /marriage-requests/:id/classification
POST /marriage-requests/:id/submit
POST /marriage-requests/:id/generate-pdf
POST /marriage-requests/:id/generate-medical-referral

## Appointments
GET /appointments
POST /appointments
GET /appointments/:id
PATCH /appointments/:id
POST /appointments/:id/cancel

## Documents
GET /documents
GET /documents/:id
POST /documents/upload

## Dashboard
GET /dashboard/summary
GET /dashboard/marriage-stats
GET /dashboard/appointment-stats