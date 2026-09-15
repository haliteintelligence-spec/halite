-- Halite Connect: permissioned consumer context for partner brands.

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConnectEventType" AS ENUM ('PROMPT_SHOWN', 'CONNECT_ACCEPTED', 'CONNECT_DECLINED', 'RECOMMENDATION_SHOWN', 'PRODUCT_VIEWED', 'ADD_TO_CART', 'WISHLISTED', 'PURCHASE', 'RETURNED', 'RATED');

-- AlterTable: public Halite identifier for every consumer.
-- Added nullable, backfilled, then enforced, so existing rows survive.
-- random() is volatile, so Postgres evaluates the default per existing row
-- rather than stamping one value across the table.
ALTER TABLE "consumers" ADD COLUMN "publicId" TEXT NOT NULL DEFAULT ('hl_' || substr(md5(random()::text), 1, 12));
CREATE UNIQUE INDEX "consumers_publicId_key" ON "consumers"("publicId");

-- CreateTable
CREATE TABLE "consent_grants" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "categories" "BeautyArea"[],
    "purpose" TEXT NOT NULL DEFAULT 'product_recommendations',
    "status" "ConsentStatus" NOT NULL DEFAULT 'ACTIVE',
    "surface" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consent_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_access_logs" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "scoped" INTEGER,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "items" JSONB NOT NULL,
    "surface" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connect_events" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "consumerId" TEXT,
    "recommendationId" TEXT,
    "productId" TEXT,
    "sku" TEXT,
    "type" "ConnectEventType" NOT NULL,
    "surface" TEXT,
    "value" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "visitorId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connect_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "consent_grants_brandId_consumerId_key" ON "consent_grants"("brandId", "consumerId");
CREATE INDEX "consent_grants_brandId_status_idx" ON "consent_grants"("brandId", "status");
CREATE INDEX "consent_grants_consumerId_status_idx" ON "consent_grants"("consumerId", "status");
CREATE INDEX "consent_access_logs_consumerId_createdAt_idx" ON "consent_access_logs"("consumerId", "createdAt" DESC);
CREATE INDEX "consent_access_logs_brandId_createdAt_idx" ON "consent_access_logs"("brandId", "createdAt" DESC);
CREATE INDEX "recommendations_brandId_createdAt_idx" ON "recommendations"("brandId", "createdAt" DESC);
CREATE INDEX "recommendations_consumerId_createdAt_idx" ON "recommendations"("consumerId", "createdAt" DESC);
CREATE INDEX "connect_events_brandId_type_occurredAt_idx" ON "connect_events"("brandId", "type", "occurredAt" DESC);
CREATE INDEX "connect_events_brandId_surface_type_idx" ON "connect_events"("brandId", "surface", "type");
CREATE INDEX "connect_events_consumerId_occurredAt_idx" ON "connect_events"("consumerId", "occurredAt" DESC);
CREATE INDEX "connect_events_recommendationId_idx" ON "connect_events"("recommendationId");

-- AddForeignKey
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consent_access_logs" ADD CONSTRAINT "consent_access_logs_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "consent_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "consent_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "connect_events" ADD CONSTRAINT "connect_events_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "connect_events" ADD CONSTRAINT "connect_events_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "connect_events" ADD CONSTRAINT "connect_events_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "recommendations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
