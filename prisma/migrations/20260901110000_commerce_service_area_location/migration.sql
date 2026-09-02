-- Add merchant-configurable regional/postal address fields for Commerce service areas.
ALTER TABLE "Company" ADD COLUMN "region" TEXT;
ALTER TABLE "Company" ADD COLUMN "postalCode" TEXT;

ALTER TABLE "Branch" ADD COLUMN "country" TEXT;
ALTER TABLE "Branch" ADD COLUMN "region" TEXT;
ALTER TABLE "Branch" ADD COLUMN "postalCode" TEXT;
