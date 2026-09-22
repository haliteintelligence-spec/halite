-- Hallie mirror + signal-level consent.
--
-- Two changes that go together: a grant now says how much of a category it
-- covers, not just which categories; and the parts of Hallie a brand is
-- allowed to see are mirrored locally so the dashboard can aggregate them
-- without reaching across into Hallie's schema on every page load.

-- CreateEnum
CREATE TYPE "ConsentSignal" AS ENUM ('PREFERENCES', 'COLLECTION', 'PRODUCT_FEEDBACK', 'CROSS_BRAND', 'SENSITIVITIES', 'INTENT', 'RETAILERS');

-- CreateEnum
CREATE TYPE "AttributeSource" AS ENUM ('CATALOG', 'INFERRED', 'NONE');

-- AlterTable: existing grants keep everything they already had access to.
-- RETAILERS is deliberately absent from the default — it is opt-in, and a
-- migration is not consent.
ALTER TABLE "consent_grants"
  ADD COLUMN "signals" "ConsentSignal"[] DEFAULT ARRAY['PREFERENCES', 'COLLECTION', 'PRODUCT_FEEDBACK', 'CROSS_BRAND', 'SENSITIVITIES', 'INTENT']::"ConsentSignal"[];

-- AlterTable
ALTER TABLE "consumers" ADD COLUMN "lastHallieSyncAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "hallie_shelf_products" (
    "id" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "hallieProductId" TEXT NOT NULL,
    "beautyArea" "BeautyArea",
    "category" "ProductCategory",
    "productType" TEXT,
    "productId" TEXT,
    "attributes" TEXT[],
    "attributeSource" "AttributeSource" NOT NULL DEFAULT 'NONE',
    "enrichedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hallie_shelf_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hallie_logs" (
    "id" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "hallieEntryId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "beautyArea" "BeautyArea",
    "loggedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hallie_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hallie_log_items" (
    "id" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "hallieItemId" TEXT NOT NULL,
    "shelfProductId" TEXT,
    "rating" INTEGER,
    "wouldRepurchase" BOOLEAN,
    "outcomeTags" TEXT[],
    "wearDuration" TEXT,
    "endOfDayLook" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hallie_log_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hallie_sync_runs" (
    "id" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "logsPulled" INTEGER NOT NULL DEFAULT 0,
    "itemsPulled" INTEGER NOT NULL DEFAULT 0,
    "productsResolved" INTEGER NOT NULL DEFAULT 0,
    "productsEnriched" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "hallie_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hallie_shelf_products_consumerId_hallieProductId_key" ON "hallie_shelf_products"("consumerId", "hallieProductId");
CREATE INDEX "hallie_shelf_products_consumerId_idx" ON "hallie_shelf_products"("consumerId");
CREATE INDEX "hallie_shelf_products_productId_idx" ON "hallie_shelf_products"("productId");

CREATE UNIQUE INDEX "hallie_logs_consumerId_hallieEntryId_key" ON "hallie_logs"("consumerId", "hallieEntryId");
CREATE INDEX "hallie_logs_consumerId_loggedAt_idx" ON "hallie_logs"("consumerId", "loggedAt" DESC);

CREATE UNIQUE INDEX "hallie_log_items_logId_hallieItemId_key" ON "hallie_log_items"("logId", "hallieItemId");
CREATE INDEX "hallie_log_items_shelfProductId_idx" ON "hallie_log_items"("shelfProductId");

CREATE INDEX "hallie_sync_runs_consumerId_startedAt_idx" ON "hallie_sync_runs"("consumerId", "startedAt" DESC);

-- AddForeignKey
ALTER TABLE "hallie_shelf_products" ADD CONSTRAINT "hallie_shelf_products_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hallie_shelf_products" ADD CONSTRAINT "hallie_shelf_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "hallie_logs" ADD CONSTRAINT "hallie_logs_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "hallie_log_items" ADD CONSTRAINT "hallie_log_items_logId_fkey" FOREIGN KEY ("logId") REFERENCES "hallie_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hallie_log_items" ADD CONSTRAINT "hallie_log_items_shelfProductId_fkey" FOREIGN KEY ("shelfProductId") REFERENCES "hallie_shelf_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "hallie_sync_runs" ADD CONSTRAINT "hallie_sync_runs_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: seasonal nudges, for the cooldown.
CREATE TABLE "seasonal_nudges" (
    "id" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "season" TEXT,
    "favour" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasonal_nudges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "seasonal_nudges_consumerId_sentAt_idx" ON "seasonal_nudges"("consumerId", "sentAt" DESC);

ALTER TABLE "seasonal_nudges" ADD CONSTRAINT "seasonal_nudges_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
