-- AlterTable
ALTER TABLE "Recommendation"
ADD COLUMN "userRating" INTEGER,
ADD COLUMN "feedbackAt" TIMESTAMP(3);
