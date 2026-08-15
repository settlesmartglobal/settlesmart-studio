ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COMMERCE_OWNER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FRONT_DESK';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'KITCHEN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DISPATCH';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'RIDER';

ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "whatsappOperationalConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "whatsappConsentAt" TIMESTAMP(3);

ALTER TABLE "NotificationEvent"
  ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'development',
  ADD COLUMN IF NOT EXISTS "templateName" TEXT,
  ADD COLUMN IF NOT EXISTS "providerMessageId" TEXT,
  ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failureCode" TEXT,
  ADD COLUMN IF NOT EXISTS "safeFailureMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "manualFallbackUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationEvent_dedupeKey_key" ON "NotificationEvent"("dedupeKey");
CREATE INDEX IF NOT EXISTS "NotificationEvent_providerMessageId_idx" ON "NotificationEvent"("providerMessageId");
CREATE INDEX IF NOT EXISTS "NotificationEvent_status_idx" ON "NotificationEvent"("status");

CREATE TABLE IF NOT EXISTS "WhatsAppInboundMessage" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "orderId" TEXT,
  "providerMessageId" TEXT,
  "fromNumber" TEXT,
  "bodyPreview" TEXT,
  "payloadJson" JSONB,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppInboundMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppInboundMessage_providerMessageId_key" ON "WhatsAppInboundMessage"("providerMessageId");
CREATE INDEX IF NOT EXISTS "WhatsAppInboundMessage_companyId_idx" ON "WhatsAppInboundMessage"("companyId");
CREATE INDEX IF NOT EXISTS "WhatsAppInboundMessage_orderId_idx" ON "WhatsAppInboundMessage"("orderId");
