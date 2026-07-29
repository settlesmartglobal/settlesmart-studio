CREATE TYPE "public"."StudioMediaUsageType" AS ENUM ('COMMERCE_HOMEPAGE_BANNER', 'COMMERCE_PRODUCT_IMAGE', 'COMMERCE_CATEGORY_BANNER', 'COMMERCE_OFFER_BANNER', 'COMMERCE_ORDER_CONFIRMATION_PROMOTION', 'COMMERCE_WHATSAPP_PROMOTION', 'GENERAL_MARKETING');

ALTER TABLE "public"."Company"
ADD COLUMN "targetAudience" TEXT,
ADD COLUMN "productsSummary" TEXT,
ADD COLUMN "brandPersonality" TEXT,
ADD COLUMN "preferredLanguage" TEXT,
ADD COLUMN "defaultPlatformsJson" JSONB;

ALTER TABLE "public"."BrandProfile"
ADD COLUMN "secondaryLogoPath" TEXT,
ADD COLUMN "lightLogoPath" TEXT,
ADD COLUMN "darkLogoPath" TEXT,
ADD COLUMN "faviconPath" TEXT,
ADD COLUMN "textColor" TEXT NOT NULL DEFAULT '#111827',
ADD COLUMN "approvedKeywordsJson" JSONB,
ADD COLUMN "restrictedWordsJson" JSONB,
ADD COLUMN "ctaStyle" TEXT;

ALTER TABLE "public"."MediaAsset"
ADD COLUMN "description" TEXT,
ADD COLUMN "tagsJson" JSONB,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "usageType" "public"."StudioMediaUsageType" NOT NULL DEFAULT 'GENERAL_MARKETING',
ADD COLUMN "approvedForExternalUse" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "approvedBy" TEXT,
ADD COLUMN "approvalNotes" TEXT;

CREATE TABLE "public"."StudioTemplate" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "templateType" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "previewImagePath" TEXT,
  "editableFieldsJson" JSONB,
  "brandCompatible" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "tagsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudioTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."StudioSettings" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "defaultLanguage" TEXT NOT NULL DEFAULT 'English',
  "defaultPlatformsJson" JSONB,
  "defaultExportFormat" TEXT NOT NULL DEFAULT 'original',
  "demoAiMode" BOOLEAN NOT NULL DEFAULT true,
  "mediaStorageInfo" TEXT,
  "integrationSettingsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudioSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."StudioActivity" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "summary" TEXT NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudioActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudioTemplate_companyId_idx" ON "public"."StudioTemplate"("companyId");
CREATE UNIQUE INDEX "StudioSettings_companyId_key" ON "public"."StudioSettings"("companyId");
CREATE INDEX "StudioActivity_companyId_idx" ON "public"."StudioActivity"("companyId");

ALTER TABLE "public"."StudioTemplate" ADD CONSTRAINT "StudioTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."StudioSettings" ADD CONSTRAINT "StudioSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."StudioActivity" ADD CONSTRAINT "StudioActivity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
