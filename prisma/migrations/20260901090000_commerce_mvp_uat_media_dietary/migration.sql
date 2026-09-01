CREATE TYPE "public"."DietaryClassification" AS ENUM ('VEG', 'NON_VEG');

ALTER TABLE "public"."Product"
  ADD COLUMN "dietaryClassification" "public"."DietaryClassification";

ALTER TABLE "public"."AddOn"
  ADD COLUMN "dietaryClassification" "public"."DietaryClassification";

UPDATE "public"."Product"
SET "dietaryClassification" = CASE WHEN "vegetarian" THEN 'VEG'::"public"."DietaryClassification" ELSE 'NON_VEG'::"public"."DietaryClassification" END;

UPDATE "public"."AddOn"
SET "dietaryClassification" = 'NON_VEG'::"public"."DietaryClassification"
WHERE lower("name") SIMILAR TO '%(chicken|mutton|egg|fish|beef|prawn|shrimp)%';

CREATE INDEX "Product_dietaryClassification_idx" ON "public"."Product"("dietaryClassification");
CREATE INDEX "AddOn_dietaryClassification_idx" ON "public"."AddOn"("dietaryClassification");
