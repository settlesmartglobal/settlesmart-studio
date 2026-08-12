-- Align NotificationEvent with the current Prisma schema after the WhatsApp lifecycle migration.
-- 20260801090000_commerce_whatsapp_roles_lifecycle added updatedAt with a database default
-- and earlier history left status defaulted differently from schema.prisma.
ALTER TABLE "public"."NotificationEvent" ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "updatedAt" DROP DEFAULT;
