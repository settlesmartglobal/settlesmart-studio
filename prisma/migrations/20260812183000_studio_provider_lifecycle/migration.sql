-- Add lifecycle metadata for Studio provider jobs, publishing idempotency, retries, and published URLs.
ALTER TYPE "public"."StudioJobStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE "public"."StudioJobStatus" ADD VALUE IF NOT EXISTS 'SUBMITTING';
ALTER TYPE "public"."StudioJobStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';

ALTER TABLE "public"."MediaProcessingJob"
  ADD COLUMN "providerJobId" TEXT,
  ADD COLUMN "publishIntentKey" TEXT,
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
  ADD COLUMN "nextRetryAt" TIMESTAMP(3),
  ADD COLUMN "failureCode" TEXT,
  ADD COLUMN "providerPostId" TEXT,
  ADD COLUMN "publishedUrl" TEXT,
  ADD COLUMN "publishedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "MediaProcessingJob_providerJobId_key" ON "public"."MediaProcessingJob"("providerJobId");
CREATE UNIQUE INDEX "MediaProcessingJob_publishIntentKey_key" ON "public"."MediaProcessingJob"("publishIntentKey");
CREATE INDEX "MediaProcessingJob_nextRetryAt_idx" ON "public"."MediaProcessingJob"("nextRetryAt");
