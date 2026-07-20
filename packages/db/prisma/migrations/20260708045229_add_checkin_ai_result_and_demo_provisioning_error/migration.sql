-- AlterTable
ALTER TABLE "check_ins" ADD COLUMN     "aiResult" TEXT,
ADD COLUMN     "aiResultGeneratedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "demoProvisioningError" JSONB;
