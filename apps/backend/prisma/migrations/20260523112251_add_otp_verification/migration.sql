-- CreateEnum
CREATE TYPE "VerificationChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('MEMBER_ACTIVATION', 'PASSWORD_RESET', 'LOGIN_VERIFICATION', 'SENSITIVE_ACTION');

-- CreateEnum
CREATE TYPE "VerificationProvider" AS ENUM ('TWILIO');

-- CreateEnum
CREATE TYPE "OtpStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetValue" TEXT NOT NULL,
    "provider" "VerificationProvider" NOT NULL,
    "providerVerificationId" TEXT,
    "channel" "VerificationChannel" NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "status" "OtpStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_verifications_targetValue_channel_purpose_status_idx" ON "otp_verifications"("targetValue", "channel", "purpose", "status");

-- CreateIndex
CREATE INDEX "otp_verifications_createdAt_idx" ON "otp_verifications"("createdAt");
