CREATE TYPE "public"."StudioOutputType" AS ENUM ('TEXT', 'POSTER', 'STORYBOARD', 'VIDEO', 'EXPORT_PACKAGE');
CREATE TYPE "public"."StudioJobType" AS ENUM ('POSTER_RENDER', 'IMAGE_ENHANCE', 'IMAGE_RESIZE', 'VIDEO_ENHANCE', 'VIDEO_ASSEMBLE', 'PLATFORM_EXPORT');
CREATE TYPE "public"."StudioJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "public"."MediaPlacementType" AS ENUM ('ORDERING_HOMEPAGE_HERO', 'ORDERING_PROMOTIONAL_BANNER', 'ORDERING_CATEGORY_BANNER', 'ORDERING_PRODUCT_IMAGE', 'ORDERING_SPECIAL_OFFER', 'ORDERING_POPUP', 'ORDER_CONFIRMATION_PROMOTION', 'COMPANY_HOMEPAGE', 'COMPANY_SERVICE_SECTION', 'COMPANY_OFFER_SECTION', 'COMPANY_PROFILE', 'RECRUITMENT_HOMEPAGE_HIRING_BANNER', 'RECRUITMENT_OPEN_ROLES', 'RECRUITMENT_JOB_PAGE');

ALTER TABLE "public"."StudioCampaign"
ADD COLUMN "structuredInputJson" JSONB,
ADD COLUMN "inputApprovedAt" TIMESTAMP(3),
ADD COLUMN "creativeBriefJson" JSONB;

ALTER TABLE "public"."MediaAsset"
ADD COLUMN "parentAssetId" TEXT,
ADD COLUMN "width" INTEGER,
ADD COLUMN "height" INTEGER,
ADD COLUMN "durationSeconds" INTEGER,
ADD COLUMN "metadataJson" JSONB;

CREATE TABLE "public"."CampaignInput" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "campaignType" "public"."CampaignType" NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceReferenceId" TEXT,
  "rawInput" TEXT,
  "structuredDetailsJson" JSONB NOT NULL,
  "missingFieldsJson" JSONB,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignInput_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."CampaignOutput" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "mediaAssetId" TEXT,
  "outputType" "public"."StudioOutputType" NOT NULL,
  "platform" TEXT NOT NULL,
  "headline" TEXT,
  "subheadline" TEXT,
  "bodyCaption" TEXT,
  "cta" TEXT,
  "hashtagsJson" JSONB,
  "altText" TEXT,
  "reviewWarningsJson" JSONB,
  "contentJson" JSONB,
  "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
  "approvedAt" TIMESTAMP(3),
  "providerMode" TEXT NOT NULL DEFAULT 'demo',
  "providerName" TEXT,
  "runMetadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignOutput_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."Storyboard" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "targetDuration" TEXT NOT NULL,
  "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Storyboard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."StoryboardScene" (
  "id" TEXT NOT NULL,
  "storyboardId" TEXT NOT NULL,
  "mediaAssetId" TEXT,
  "sequenceNumber" INTEGER NOT NULL,
  "durationSeconds" INTEGER NOT NULL,
  "scenePurpose" TEXT NOT NULL,
  "headlineCaption" TEXT NOT NULL,
  "visualRecommendation" TEXT NOT NULL,
  "transition" TEXT,
  "voiceoverText" TEXT,
  "musicMood" TEXT,
  "cta" TEXT,
  "finalEndCard" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoryboardScene_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."MediaProcessingJob" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "campaignId" TEXT,
  "inputMediaAssetId" TEXT,
  "outputMediaAssetId" TEXT,
  "jobType" "public"."StudioJobType" NOT NULL,
  "status" "public"."StudioJobStatus" NOT NULL DEFAULT 'QUEUED',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "configurationJson" JSONB,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaProcessingJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."MediaPlacement" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "campaignId" TEXT,
  "mediaAssetId" TEXT NOT NULL,
  "productId" TEXT,
  "placement" "public"."MediaPlacementType" NOT NULL,
  "linkedTargetId" TEXT,
  "cta" TEXT,
  "destinationUrl" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaPlacement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MediaAsset_parentAssetId_idx" ON "public"."MediaAsset"("parentAssetId");
CREATE INDEX "CampaignInput_companyId_idx" ON "public"."CampaignInput"("companyId");
CREATE INDEX "CampaignInput_campaignId_idx" ON "public"."CampaignInput"("campaignId");
CREATE INDEX "CampaignOutput_companyId_idx" ON "public"."CampaignOutput"("companyId");
CREATE INDEX "CampaignOutput_campaignId_idx" ON "public"."CampaignOutput"("campaignId");
CREATE INDEX "CampaignOutput_mediaAssetId_idx" ON "public"."CampaignOutput"("mediaAssetId");
CREATE INDEX "Storyboard_companyId_idx" ON "public"."Storyboard"("companyId");
CREATE INDEX "Storyboard_campaignId_idx" ON "public"."Storyboard"("campaignId");
CREATE INDEX "StoryboardScene_storyboardId_idx" ON "public"."StoryboardScene"("storyboardId");
CREATE INDEX "StoryboardScene_mediaAssetId_idx" ON "public"."StoryboardScene"("mediaAssetId");
CREATE INDEX "MediaProcessingJob_companyId_idx" ON "public"."MediaProcessingJob"("companyId");
CREATE INDEX "MediaProcessingJob_campaignId_idx" ON "public"."MediaProcessingJob"("campaignId");
CREATE INDEX "MediaProcessingJob_inputMediaAssetId_idx" ON "public"."MediaProcessingJob"("inputMediaAssetId");
CREATE INDEX "MediaProcessingJob_outputMediaAssetId_idx" ON "public"."MediaProcessingJob"("outputMediaAssetId");
CREATE INDEX "MediaPlacement_companyId_idx" ON "public"."MediaPlacement"("companyId");
CREATE INDEX "MediaPlacement_campaignId_idx" ON "public"."MediaPlacement"("campaignId");
CREATE INDEX "MediaPlacement_mediaAssetId_idx" ON "public"."MediaPlacement"("mediaAssetId");
CREATE INDEX "MediaPlacement_productId_idx" ON "public"."MediaPlacement"("productId");

ALTER TABLE "public"."MediaAsset" ADD CONSTRAINT "MediaAsset_parentAssetId_fkey" FOREIGN KEY ("parentAssetId") REFERENCES "public"."MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."CampaignInput" ADD CONSTRAINT "CampaignInput_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CampaignInput" ADD CONSTRAINT "CampaignInput_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."StudioCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CampaignOutput" ADD CONSTRAINT "CampaignOutput_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CampaignOutput" ADD CONSTRAINT "CampaignOutput_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."StudioCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."CampaignOutput" ADD CONSTRAINT "CampaignOutput_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "public"."MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."Storyboard" ADD CONSTRAINT "Storyboard_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Storyboard" ADD CONSTRAINT "Storyboard_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."StudioCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."StoryboardScene" ADD CONSTRAINT "StoryboardScene_storyboardId_fkey" FOREIGN KEY ("storyboardId") REFERENCES "public"."Storyboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MediaProcessingJob" ADD CONSTRAINT "MediaProcessingJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MediaProcessingJob" ADD CONSTRAINT "MediaProcessingJob_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."StudioCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."MediaProcessingJob" ADD CONSTRAINT "MediaProcessingJob_inputMediaAssetId_fkey" FOREIGN KEY ("inputMediaAssetId") REFERENCES "public"."MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."MediaProcessingJob" ADD CONSTRAINT "MediaProcessingJob_outputMediaAssetId_fkey" FOREIGN KEY ("outputMediaAssetId") REFERENCES "public"."MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."MediaPlacement" ADD CONSTRAINT "MediaPlacement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MediaPlacement" ADD CONSTRAINT "MediaPlacement_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."StudioCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."MediaPlacement" ADD CONSTRAINT "MediaPlacement_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "public"."MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
