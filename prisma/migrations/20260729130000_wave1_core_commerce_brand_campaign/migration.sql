-- CreateEnum
CREATE TYPE "public"."BusinessType" AS ENUM ('RESTAURANT', 'GROCERY', 'HOTEL', 'RECRUITMENT_AGENCY', 'MANPOWER_CONSULTANCY', 'HR_CONSULTANCY', 'CLINIC', 'RETAIL', 'EDUCATION', 'SERVICE_BUSINESS', 'OTHER');
CREATE TYPE "public"."ApprovalStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "public"."BrandAssetType" AS ENUM ('LOGO', 'BUSINESS_CARD', 'POSTER', 'PAMPHLET', 'BROCHURE', 'MENU', 'PRODUCT_IMAGE', 'REFERENCE_IMAGE', 'REFERENCE_VIDEO', 'DOCUMENT');
CREATE TYPE "public"."ExtractionStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "public"."OrderStatus" AS ENUM ('NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED');
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH_ON_DELIVERY', 'CARD_ON_DELIVERY', 'PICKUP_PAYMENT');
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'NOT_APPLICABLE');
CREATE TYPE "public"."FulfilmentType" AS ENUM ('DELIVERY', 'PICKUP');
CREATE TYPE "public"."OrderSource" AS ENUM ('CUSTOMER_PWA', 'MANUAL_WHATSAPP', 'MANUAL_PHONE', 'ADMIN');
CREATE TYPE "public"."CampaignType" AS ENUM ('RECRUITMENT', 'PRODUCT', 'MENU_ITEM', 'SERVICE', 'OFFER', 'EVENT', 'ANNOUNCEMENT', 'COMPANY_PROFILE');
CREATE TYPE "public"."CampaignStatus" AS ENUM ('DRAFT', 'READY_FOR_GENERATION', 'GENERATING', 'GENERATED', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'FAILED', 'ARCHIVED');
CREATE TYPE "public"."MediaAssetType" AS ENUM ('IMAGE', 'POSTER', 'BANNER', 'REEL', 'VIDEO', 'LOGO', 'DOCUMENT');
CREATE TYPE "public"."MediaCategory" AS ENUM ('BRAND', 'RECRUITMENT', 'PRODUCT', 'MENU', 'SERVICE', 'OFFER', 'COMPANY', 'SOCIAL', 'ORDERING_APP');
CREATE TYPE "public"."MediaSourceType" AS ENUM ('UPLOADED', 'GENERATED', 'ENHANCED', 'IMPORTED');

-- AlterTable
ALTER TABLE "public"."Company"
ADD COLUMN "businessType" "public"."BusinessType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "industry" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "latitude" DECIMAL(10,7),
ADD COLUMN "longitude" DECIMAL(10,7),
ADD COLUMN "whatsapp" TEXT,
ADD COLUMN "orderingSlug" TEXT,
ADD COLUMN "commerceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "studioEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "recruitmentEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."BrandProfile" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "tagline" TEXT, "logoPath" TEXT, "primaryColor" TEXT NOT NULL DEFAULT '#2563eb', "secondaryColor" TEXT NOT NULL DEFAULT '#14b8a6', "accentColor" TEXT NOT NULL DEFAULT '#f97316', "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff', "headingFont" TEXT NOT NULL DEFAULT 'Inter', "bodyFont" TEXT NOT NULL DEFAULT 'Inter', "brandTone" TEXT, "visualStyle" TEXT, "preferredImageStyle" TEXT, "preferredVideoStyle" TEXT, "defaultCallToAction" TEXT, "instagramHandle" TEXT, "facebookPage" TEXT, "linkedinPage" TEXT, "whatsappNumber" TEXT, "approvalStatus" "public"."ApprovalStatus" NOT NULL DEFAULT 'DRAFT', "approvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id"));
CREATE TABLE "public"."BrandAsset" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "brandProfileId" TEXT, "assetType" "public"."BrandAssetType" NOT NULL, "originalFilename" TEXT NOT NULL, "storedFilename" TEXT NOT NULL, "filePath" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "fileSize" INTEGER NOT NULL, "extractionStatus" "public"."ExtractionStatus" NOT NULL DEFAULT 'NOT_STARTED', "approved" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "BrandAsset_pkey" PRIMARY KEY ("id"));
CREATE TABLE "public"."ProductCategory" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT, "imagePath" TEXT, "displayOrder" INTEGER NOT NULL DEFAULT 0, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id"));
CREATE TABLE "public"."Product" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "categoryId" TEXT, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "shortDescription" TEXT, "description" TEXT, "regularPrice" DECIMAL(10,2) NOT NULL, "promotionalPrice" DECIMAL(10,2), "imagePath" TEXT, "vegetarian" BOOLEAN NOT NULL DEFAULT false, "available" BOOLEAN NOT NULL DEFAULT true, "featured" BOOLEAN NOT NULL DEFAULT false, "preparationMinutes" INTEGER, "displayOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Product_pkey" PRIMARY KEY ("id"));
CREATE TABLE "public"."DeliveryZone" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "name" TEXT NOT NULL, "radiusKm" DECIMAL(8,2) NOT NULL, "deliveryCharge" DECIMAL(10,2) NOT NULL, "minimumOrderAmount" DECIMAL(10,2) NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id"));
CREATE TABLE "public"."OperatingHours" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "dayOfWeek" INTEGER NOT NULL, "openTime" TEXT NOT NULL, "closeTime" TEXT NOT NULL, "closed" BOOLEAN NOT NULL DEFAULT false, CONSTRAINT "OperatingHours_pkey" PRIMARY KEY ("id"));
CREATE TABLE "public"."Customer" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "name" TEXT NOT NULL, "mobile" TEXT NOT NULL, "email" TEXT, "marketingConsent" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"));
CREATE TABLE "public"."Order" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "customerId" TEXT NOT NULL, "orderNumber" TEXT NOT NULL, "status" "public"."OrderStatus" NOT NULL DEFAULT 'NEW', "paymentMethod" "public"."PaymentMethod" NOT NULL, "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING', "fulfilmentType" "public"."FulfilmentType" NOT NULL, "subtotal" DECIMAL(10,2) NOT NULL, "deliveryCharge" DECIMAL(10,2) NOT NULL, "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0, "totalAmount" DECIMAL(10,2) NOT NULL, "customerNameSnapshot" TEXT NOT NULL, "customerMobileSnapshot" TEXT NOT NULL, "deliveryAddressSnapshotJson" JSONB, "customerLatitude" DECIMAL(10,7), "customerLongitude" DECIMAL(10,7), "specialInstructions" TEXT, "source" "public"."OrderSource" NOT NULL DEFAULT 'CUSTOMER_PWA', "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "acceptedAt" TIMESTAMP(3), "preparingAt" TIMESTAMP(3), "readyAt" TIMESTAMP(3), "outForDeliveryAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Order_pkey" PRIMARY KEY ("id"));
CREATE TABLE "public"."OrderItem" ("id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "productId" TEXT, "productNameSnapshot" TEXT NOT NULL, "unitPrice" DECIMAL(10,2) NOT NULL, "quantity" INTEGER NOT NULL, "lineTotal" DECIMAL(10,2) NOT NULL, "selectedOptionsJson" JSONB, CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"));
CREATE TABLE "public"."OrderStatusHistory" ("id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "previousStatus" "public"."OrderStatus", "newStatus" "public"."OrderStatus" NOT NULL, "note" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id"));
CREATE TABLE "public"."StudioCampaign" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "productId" TEXT, "name" TEXT NOT NULL, "campaignType" "public"."CampaignType" NOT NULL, "objective" TEXT, "sourceType" TEXT, "sourceReferenceId" TEXT, "status" "public"."CampaignStatus" NOT NULL DEFAULT 'DRAFT', "selectedPlatformsJson" JSONB, "inputText" TEXT, "startDate" TIMESTAMP(3), "endDate" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "StudioCampaign_pkey" PRIMARY KEY ("id"));
CREATE TABLE "public"."MediaAsset" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "campaignId" TEXT, "productId" TEXT, "title" TEXT NOT NULL, "assetType" "public"."MediaAssetType" NOT NULL, "category" "public"."MediaCategory" NOT NULL, "sourceType" "public"."MediaSourceType" NOT NULL DEFAULT 'UPLOADED', "originalFilename" TEXT NOT NULL, "storedFilename" TEXT NOT NULL, "filePath" TEXT NOT NULL, "mimeType" TEXT NOT NULL, "fileSize" INTEGER NOT NULL, "platform" TEXT, "approvalStatus" "public"."ApprovalStatus" NOT NULL DEFAULT 'DRAFT', "approvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id"));

-- CreateIndex
CREATE UNIQUE INDEX "Company_orderingSlug_key" ON "public"."Company"("orderingSlug");
CREATE UNIQUE INDEX "BrandProfile_companyId_key" ON "public"."BrandProfile"("companyId");
CREATE INDEX "BrandAsset_companyId_idx" ON "public"."BrandAsset"("companyId");
CREATE INDEX "BrandAsset_brandProfileId_idx" ON "public"."BrandAsset"("brandProfileId");
CREATE UNIQUE INDEX "ProductCategory_companyId_slug_key" ON "public"."ProductCategory"("companyId", "slug");
CREATE INDEX "ProductCategory_companyId_idx" ON "public"."ProductCategory"("companyId");
CREATE UNIQUE INDEX "Product_companyId_slug_key" ON "public"."Product"("companyId", "slug");
CREATE INDEX "Product_companyId_idx" ON "public"."Product"("companyId");
CREATE INDEX "Product_categoryId_idx" ON "public"."Product"("categoryId");
CREATE INDEX "DeliveryZone_companyId_idx" ON "public"."DeliveryZone"("companyId");
CREATE UNIQUE INDEX "OperatingHours_companyId_dayOfWeek_key" ON "public"."OperatingHours"("companyId", "dayOfWeek");
CREATE INDEX "OperatingHours_companyId_idx" ON "public"."OperatingHours"("companyId");
CREATE INDEX "Customer_companyId_idx" ON "public"."Customer"("companyId");
CREATE INDEX "Customer_companyId_mobile_idx" ON "public"."Customer"("companyId", "mobile");
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "public"."Order"("orderNumber");
CREATE INDEX "Order_companyId_idx" ON "public"."Order"("companyId");
CREATE INDEX "Order_customerId_idx" ON "public"."Order"("customerId");
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "public"."OrderItem"("productId");
CREATE INDEX "OrderStatusHistory_orderId_idx" ON "public"."OrderStatusHistory"("orderId");
CREATE INDEX "StudioCampaign_companyId_idx" ON "public"."StudioCampaign"("companyId");
CREATE INDEX "StudioCampaign_productId_idx" ON "public"."StudioCampaign"("productId");
CREATE INDEX "MediaAsset_companyId_idx" ON "public"."MediaAsset"("companyId");
CREATE INDEX "MediaAsset_campaignId_idx" ON "public"."MediaAsset"("campaignId");
CREATE INDEX "MediaAsset_productId_idx" ON "public"."MediaAsset"("productId");

-- AddForeignKey
ALTER TABLE "public"."BrandProfile" ADD CONSTRAINT "BrandProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."BrandAsset" ADD CONSTRAINT "BrandAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."BrandAsset" ADD CONSTRAINT "BrandAsset_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "public"."BrandProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."ProductCategory" ADD CONSTRAINT "ProductCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."DeliveryZone" ADD CONSTRAINT "DeliveryZone_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."OperatingHours" ADD CONSTRAINT "OperatingHours_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."StudioCampaign" ADD CONSTRAINT "StudioCampaign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."StudioCampaign" ADD CONSTRAINT "StudioCampaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."MediaAsset" ADD CONSTRAINT "MediaAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MediaAsset" ADD CONSTRAINT "MediaAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."StudioCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."MediaAsset" ADD CONSTRAINT "MediaAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
