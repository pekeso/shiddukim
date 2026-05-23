/*
  Warnings:

  - You are about to drop the column `photoUrl` on the `members` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "members" DROP COLUMN "photoUrl",
ADD COLUMN     "photoDocumentId" TEXT;
