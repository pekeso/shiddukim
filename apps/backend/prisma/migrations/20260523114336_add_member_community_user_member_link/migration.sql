-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "address" TEXT,
ADD COLUMN     "baptismDate" TIMESTAMP(3),
ADD COLUMN     "baptizedBy" TEXT,
ADD COLUMN     "communityId" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "placeOfBirth" TEXT;

-- CreateTable
CREATE TABLE "communities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "presidentMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_member_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_member_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "communities_name_key" ON "communities"("name");

-- CreateIndex
CREATE INDEX "user_member_links_memberId_idx" ON "user_member_links"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "user_member_links_userId_memberId_key" ON "user_member_links"("userId", "memberId");

-- CreateIndex
CREATE INDEX "members_lastName_firstName_idx" ON "members"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "members_email_idx" ON "members"("email");

-- CreateIndex
CREATE INDEX "members_phone_idx" ON "members"("phone");

-- CreateIndex
CREATE INDEX "members_communityId_idx" ON "members"("communityId");

-- CreateIndex
CREATE INDEX "members_status_idx" ON "members"("status");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communities" ADD CONSTRAINT "communities_presidentMemberId_fkey" FOREIGN KEY ("presidentMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_member_links" ADD CONSTRAINT "user_member_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_member_links" ADD CONSTRAINT "user_member_links_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
