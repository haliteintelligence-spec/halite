-- A consumer's identity originates in Hallie. Where the Hallie account can
-- be resolved, its id becomes the identity partner brands see.

ALTER TABLE "consumers" ADD COLUMN "hallieUserId" TEXT;
CREATE UNIQUE INDEX "consumers_hallieUserId_key" ON "consumers"("hallieUserId");
