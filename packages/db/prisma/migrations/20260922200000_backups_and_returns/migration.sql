-- Spares, and the difference between finishing something and sending it back.
ALTER TABLE "hallie_shelf_products"
  ADD COLUMN "backupCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "wasReturned" BOOLEAN NOT NULL DEFAULT false;
