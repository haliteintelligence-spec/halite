-- Adds encrypted-at-rest columns for two previously-plaintext secrets.
-- Both are additive/nullable — no backfill, no lock beyond a metadata
-- change, and no existing read path breaks: application code falls back to
-- the legacy plaintext "shopifyToken" column until a brand reconnects, and
-- simply omits the demo password display for demos created before this
-- migration (see apps/api/src/lib/secret-box.ts for the encryption code).

ALTER TABLE "brands" ADD COLUMN "shopifyTokenEncrypted" TEXT;
ALTER TABLE "brands" ADD COLUMN "demoPasswordEncrypted" TEXT;
