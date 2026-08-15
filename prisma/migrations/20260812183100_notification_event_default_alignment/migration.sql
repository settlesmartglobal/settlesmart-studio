-- AlterTable
ALTER TABLE "public"."NotificationEvent" ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "updatedAt" DROP DEFAULT;
