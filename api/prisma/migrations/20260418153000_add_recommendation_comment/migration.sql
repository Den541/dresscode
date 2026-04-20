-- AlterTable
ALTER TABLE "Recommendation"
ADD COLUMN "userComment" TEXT,
ADD COLUMN "commentedAt" TIMESTAMP(3);
