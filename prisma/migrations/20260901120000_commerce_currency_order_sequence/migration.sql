-- Add explicit merchant currency and customer-facing order prefix configuration.
ALTER TABLE "Company" ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'AED';
ALTER TABLE "Company" ADD COLUMN "orderPrefix" TEXT NOT NULL DEFAULT 'SS';

-- Store merchant-scoped daily order counters for concurrency-safe order numbers.
CREATE TABLE "OrderSequence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sequenceDate" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderSequence_companyId_sequenceDate_key" ON "OrderSequence"("companyId", "sequenceDate");
CREATE INDEX "OrderSequence_companyId_idx" ON "OrderSequence"("companyId");
ALTER TABLE "OrderSequence" ADD CONSTRAINT "OrderSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
