-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "weatherSnapshot" JSONB NOT NULL,
    "preferencesSnapshot" JSONB NOT NULL,
    "recommendedItems" JSONB NOT NULL,
    "fromWardrobeItems" JSONB NOT NULL,
    "missingItems" JSONB NOT NULL,
    "reasons" JSONB NOT NULL,
    "selectedWardrobeItemIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recommendation_userId_createdAt_idx" ON "Recommendation"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
