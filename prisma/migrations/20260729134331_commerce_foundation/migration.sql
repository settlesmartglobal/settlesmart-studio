/*
  Warnings:

  - The values [NEW] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[companyId,mobile]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[trackingToken]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,idempotencyKey]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Existing NEW orders are remapped to PENDING before the enum is replaced.
  - Existing orders receive deterministic tracking tokens before the column is made required.

*/
-- CreateEnum
CREATE TYPE "public"."RiderAvailabilityStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'OFFLINE');

-- CreateEnum
CREATE TYPE "public"."PromotionType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE', 'FREE_DELIVERY');

-- CreateEnum
CREATE TYPE "public"."NotificationEventType" AS ENUM ('ORDER_CREATED', 'ORDER_ACCEPTED', 'ORDER_REJECTED', 'ORDER_PREPARING', 'ORDER_READY', 'RIDER_ASSIGNED', 'ORDER_PICKED_UP', 'ORDER_OUT_FOR_DELIVERY', 'ORDER_DELIVERED', 'ORDER_CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."OrderStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'PREPARING', 'READY', 'RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."Order" ALTER COLUMN "status" DROP DEFAULT;
UPDATE "public"."Order" SET "status" = 'PENDING' WHERE "status"::text = 'NEW';
UPDATE "public"."OrderStatusHistory" SET "previousStatus" = 'PENDING' WHERE "previousStatus"::text = 'NEW';
UPDATE "public"."OrderStatusHistory" SET "newStatus" = 'PENDING' WHERE "newStatus"::text = 'NEW';
ALTER TABLE "public"."Order" ALTER COLUMN "status" TYPE "public"."OrderStatus_new" USING ("status"::text::"public"."OrderStatus_new");
ALTER TABLE "public"."OrderStatusHistory" ALTER COLUMN "previousStatus" TYPE "public"."OrderStatus_new" USING ("previousStatus"::text::"public"."OrderStatus_new");
ALTER TABLE "public"."OrderStatusHistory" ALTER COLUMN "newStatus" TYPE "public"."OrderStatus_new" USING ("newStatus"::text::"public"."OrderStatus_new");
ALTER TYPE "public"."OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "public"."OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "public"."Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."PaymentMethod" ADD VALUE 'CASH_ON_PICKUP';
ALTER TYPE "public"."PaymentMethod" ADD VALUE 'CARD_ON_PICKUP';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."PaymentStatus" ADD VALUE 'COLLECTED';
ALTER TYPE "public"."PaymentStatus" ADD VALUE 'NOT_REQUIRED';

-- DropIndex
DROP INDEX "public"."Customer_companyId_mobile_idx";

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "amountCollected" DECIMAL(10,2),
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "paymentCollectedAt" TIMESTAMP(3),
ADD COLUMN     "paymentCollectedBy" TEXT,
ADD COLUMN     "paymentNotes" TEXT,
ADD COLUMN     "pickedUpAt" TIMESTAMP(3),
ADD COLUMN     "riderId" TEXT,
ADD COLUMN     "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "trackingToken" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

UPDATE "public"."Order"
SET "trackingToken" = md5("id" || '-' || "orderNumber" || '-' || "placedAt"::text)
WHERE "trackingToken" IS NULL;

ALTER TABLE "public"."Order" ALTER COLUMN "trackingToken" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."OrderStatusHistory" ADD COLUMN     "changedBy" TEXT,
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "bestseller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "spicy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "studioMediaAssetId" TEXT,
ADD COLUMN     "taxable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."ProductCategory" ADD COLUMN     "availableFrom" TEXT,
ADD COLUMN     "availableUntil" TEXT;

-- CreateTable
CREATE TABLE "public"."CommerceBusinessSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "cuisinesJson" JSONB,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dubai',
    "taxPercentage" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "minimumOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deliveryCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "freeDeliveryThreshold" DECIMAL(10,2),
    "preparationMinutes" INTEGER NOT NULL DEFAULT 30,
    "deliveryRadiusKm" DECIMAL(8,2) NOT NULL DEFAULT 5,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cashPaymentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cardOnDeliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "onlinePaymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "acceptingOrders" BOOLEAN NOT NULL DEFAULT true,
    "temporaryClosureMessage" TEXT,
    "logoMediaAssetId" TEXT,
    "coverMediaAssetId" TEXT,
    "logoPath" TEXT,
    "coverImagePath" TEXT,
    "terms" TEXT,
    "cancellationPolicy" TEXT,
    "demoBusiness" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommerceBusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Branch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "deliveryRadiusKm" DECIMAL(8,2) NOT NULL DEFAULT 5,
    "minimumOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "freeDeliveryThreshold" DECIMAL(10,2),
    "preparationMinutes" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "temporarilyClosed" BOOLEAN NOT NULL DEFAULT false,
    "closureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BranchOperatingHours" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BranchOperatingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AddOnGroup" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,
    "multipleSelection" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOnGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AddOn" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductAddOnGroup" (
    "productId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "ProductAddOnGroup_pkey" PRIMARY KEY ("productId","groupId")
);

-- CreateTable
CREATE TABLE "public"."CustomerAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT,
    "addressLine" TEXT NOT NULL,
    "building" TEXT,
    "apartment" TEXT,
    "area" TEXT,
    "landmark" TEXT,
    "city" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Rider" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "vehicleType" TEXT,
    "vehicleNumber" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "availabilityStatus" "public"."RiderAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "secureAccessCode" TEXT NOT NULL,
    "currentOrderId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RiderAssignment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RiderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Promotion" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."PromotionType" NOT NULL,
    "fixedDiscount" DECIMAL(10,2),
    "percentDiscount" DECIMAL(5,2),
    "minimumOrder" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maximumDiscount" DECIMAL(10,2),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PromotionUsage" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomerFeedback" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotificationEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderId" TEXT,
    "eventType" "public"."NotificationEventType" NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'development-log',
    "recipient" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOGGED',
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommerceBusinessSettings_companyId_key" ON "public"."CommerceBusinessSettings"("companyId");

-- CreateIndex
CREATE INDEX "Branch_companyId_idx" ON "public"."Branch"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_companyId_code_key" ON "public"."Branch"("companyId", "code");

-- CreateIndex
CREATE INDEX "BranchOperatingHours_branchId_idx" ON "public"."BranchOperatingHours"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchOperatingHours_branchId_dayOfWeek_key" ON "public"."BranchOperatingHours"("branchId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "public"."ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_name_key" ON "public"."ProductVariant"("productId", "name");

-- CreateIndex
CREATE INDEX "AddOnGroup_companyId_idx" ON "public"."AddOnGroup"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AddOnGroup_companyId_name_key" ON "public"."AddOnGroup"("companyId", "name");

-- CreateIndex
CREATE INDEX "AddOn_groupId_idx" ON "public"."AddOn"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "AddOn_groupId_name_key" ON "public"."AddOn"("groupId", "name");

-- CreateIndex
CREATE INDEX "CustomerAddress_customerId_idx" ON "public"."CustomerAddress"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Rider_secureAccessCode_key" ON "public"."Rider"("secureAccessCode");

-- CreateIndex
CREATE INDEX "Rider_companyId_idx" ON "public"."Rider"("companyId");

-- CreateIndex
CREATE INDEX "RiderAssignment_orderId_idx" ON "public"."RiderAssignment"("orderId");

-- CreateIndex
CREATE INDEX "RiderAssignment_riderId_idx" ON "public"."RiderAssignment"("riderId");

-- CreateIndex
CREATE INDEX "Promotion_companyId_idx" ON "public"."Promotion"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_companyId_code_key" ON "public"."Promotion"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionUsage_promotionId_orderId_key" ON "public"."PromotionUsage"("promotionId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedback_orderId_key" ON "public"."CustomerFeedback"("orderId");

-- CreateIndex
CREATE INDEX "NotificationEvent_companyId_idx" ON "public"."NotificationEvent"("companyId");

-- CreateIndex
CREATE INDEX "NotificationEvent_orderId_idx" ON "public"."NotificationEvent"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_companyId_mobile_key" ON "public"."Customer"("companyId", "mobile");

-- CreateIndex
CREATE UNIQUE INDEX "Order_trackingToken_key" ON "public"."Order"("trackingToken");

-- CreateIndex
CREATE INDEX "Order_branchId_idx" ON "public"."Order"("branchId");

-- CreateIndex
CREATE INDEX "Order_riderId_idx" ON "public"."Order"("riderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_companyId_idempotencyKey_key" ON "public"."Order"("companyId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "public"."CommerceBusinessSettings" ADD CONSTRAINT "CommerceBusinessSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Branch" ADD CONSTRAINT "Branch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BranchOperatingHours" ADD CONSTRAINT "BranchOperatingHours_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AddOn" ADD CONSTRAINT "AddOn_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."AddOnGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductAddOnGroup" ADD CONSTRAINT "ProductAddOnGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductAddOnGroup" ADD CONSTRAINT "ProductAddOnGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."AddOnGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerAddress" ADD CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "public"."Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Rider" ADD CONSTRAINT "Rider_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RiderAssignment" ADD CONSTRAINT "RiderAssignment_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "public"."Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Promotion" ADD CONSTRAINT "Promotion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PromotionUsage" ADD CONSTRAINT "PromotionUsage_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "public"."Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationEvent" ADD CONSTRAINT "NotificationEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
