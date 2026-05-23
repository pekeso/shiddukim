-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('MEMBER_PHOTO', 'MEMBER_CARD', 'MARRIAGE_REQUEST_PDF', 'MEDICAL_REFERRAL_PDF', 'SUPPORTING_DOCUMENT');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('PRIVATE', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "FileAccessAction" AS ENUM ('VIEW', 'DOWNLOAD', 'UPLOAD', 'DELETE', 'GENERATE');

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "documentCode" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "originalFileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "r2Bucket" TEXT NOT NULL,
    "r2ObjectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "generatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_access_logs" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "FileAccessAction" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "file_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_documentCode_key" ON "documents"("documentCode");

-- CreateIndex
CREATE UNIQUE INDEX "documents_r2ObjectKey_key" ON "documents"("r2ObjectKey");

-- CreateIndex
CREATE INDEX "documents_ownerType_ownerId_idx" ON "documents"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "documents_documentType_idx" ON "documents"("documentType");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_uploadedByUserId_idx" ON "documents"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "documents_createdAt_idx" ON "documents"("createdAt");

-- CreateIndex
CREATE INDEX "file_access_logs_documentId_idx" ON "file_access_logs"("documentId");

-- CreateIndex
CREATE INDEX "file_access_logs_actorUserId_idx" ON "file_access_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "file_access_logs_action_idx" ON "file_access_logs"("action");

-- CreateIndex
CREATE INDEX "file_access_logs_accessedAt_idx" ON "file_access_logs"("accessedAt");

-- AddForeignKey
ALTER TABLE "file_access_logs" ADD CONSTRAINT "file_access_logs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
