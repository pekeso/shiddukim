-- AlterTable
ALTER TABLE "marriage_requests" ADD COLUMN     "familiesMet" BOOLEAN,
ADD COLUMN     "familiesMetSince" VARCHAR(255),
ADD COLUMN     "hasBeenIntimate" BOOLEAN,
ADD COLUMN     "hasContactWithSpouse" BOOLEAN,
ADD COLUMN     "hasKissed" BOOLEAN,
ADD COLUMN     "hasPhysicalContact" BOOLEAN,
ADD COLUMN     "hasSpokenToSpouse" BOOLEAN,
ADD COLUMN     "hasSpokenToSpouseSince" VARCHAR(255),
ADD COLUMN     "intimacyCount" VARCHAR(255),
ADD COLUMN     "parentsApprove" BOOLEAN,
ADD COLUMN     "parentsAware" BOOLEAN,
ADD COLUMN     "parentsKnowSpouse" BOOLEAN,
ADD COLUMN     "spouseParentsAware" BOOLEAN;
