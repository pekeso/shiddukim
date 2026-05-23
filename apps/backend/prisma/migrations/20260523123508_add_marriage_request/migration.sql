-- CreateEnum
CREATE TYPE "MarriageRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'WAITING_APPOINTMENT', 'COUNSELING', 'MEDICAL_REFERRAL', 'WAITING_RESULTS', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MarriageClassification" AS ENUM ('GREEN', 'ORANGE', 'RED');

-- CreateTable
CREATE TABLE "marriage_requests" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "spouseFullName" TEXT,
    "spousePhone" TEXT,
    "spouseEmail" TEXT,
    "intendedMarriageDate" TIMESTAMP(3),
    "status" "MarriageRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "classification" "MarriageClassification",
    "pastorNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marriage_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marriage_requests_requestCode_key" ON "marriage_requests"("requestCode");

-- CreateIndex
CREATE INDEX "marriage_requests_memberId_idx" ON "marriage_requests"("memberId");

-- CreateIndex
CREATE INDEX "marriage_requests_status_idx" ON "marriage_requests"("status");

-- CreateIndex
CREATE INDEX "marriage_requests_createdAt_idx" ON "marriage_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "marriage_requests" ADD CONSTRAINT "marriage_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
