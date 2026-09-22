-- What the shopper actually wears, and how much of it is left.

-- AlterTable: levels and size, for replenishment.
ALTER TABLE "hallie_shelf_products"
  ADD COLUMN "initialLevel"  INTEGER,
  ADD COLUMN "statedLevel"   INTEGER,
  ADD COLUMN "statedLevelAt" TIMESTAMP(3),
  ADD COLUMN "isEmpty"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "emptiedAt"     TIMESTAMP(3),
  ADD COLUMN "repurchasedAt" TIMESTAMP(3),
  ADD COLUMN "sizeValue"     DOUBLE PRECISION,
  ADD COLUMN "sizeUnit"      TEXT;

-- CreateTable
CREATE TABLE "hallie_routines" (
    "id" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "hallieStackId" TEXT NOT NULL,
    "name" TEXT,
    "timeOfDay" TEXT,
    "isEveryday" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hallie_routines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hallie_routine_items" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "shelfProductId" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "hallie_routine_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hallie_layerings" (
    "id" TEXT NOT NULL,
    "consumerId" TEXT NOT NULL,
    "hallieChoiceId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "slot" TEXT,
    "shelfProductIds" TEXT[],
    "why" TEXT,
    "moods" TEXT[],
    "occasions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hallie_layerings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hallie_routines_consumerId_hallieStackId_key" ON "hallie_routines"("consumerId", "hallieStackId");
CREATE INDEX "hallie_routines_consumerId_idx" ON "hallie_routines"("consumerId");
CREATE UNIQUE INDEX "hallie_routine_items_routineId_position_key" ON "hallie_routine_items"("routineId", "position");
CREATE INDEX "hallie_routine_items_shelfProductId_idx" ON "hallie_routine_items"("shelfProductId");
CREATE UNIQUE INDEX "hallie_layerings_consumerId_hallieChoiceId_key" ON "hallie_layerings"("consumerId", "hallieChoiceId");
CREATE INDEX "hallie_layerings_consumerId_dayKey_idx" ON "hallie_layerings"("consumerId", "dayKey");

-- AddForeignKey
ALTER TABLE "hallie_routines" ADD CONSTRAINT "hallie_routines_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hallie_routine_items" ADD CONSTRAINT "hallie_routine_items_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "hallie_routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hallie_routine_items" ADD CONSTRAINT "hallie_routine_items_shelfProductId_fkey" FOREIGN KEY ("shelfProductId") REFERENCES "hallie_shelf_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hallie_layerings" ADD CONSTRAINT "hallie_layerings_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
