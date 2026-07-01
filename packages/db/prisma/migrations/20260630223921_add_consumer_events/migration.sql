-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "BrandType" AS ENUM ('DEMO', 'ONBOARDED');

-- CreateEnum
CREATE TYPE "BrandPlan" AS ENUM ('STARTER', 'GROWTH', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "BeautyArea" AS ENUM ('SKINCARE', 'BODY', 'HAIR', 'MAKEUP', 'FRAGRANCE', 'NAILS', 'WELLNESS', 'SUN_CARE', 'LIP_CARE', 'EYE_CARE');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "LoginMethod" AS ENUM ('LOGIN', 'REGISTER', 'IMPERSONATE');

-- CreateEnum
CREATE TYPE "CatalogFormat" AS ENUM ('CSV', 'JSON', 'SHOPIFY_SYNC', 'XLSX');

-- CreateEnum
CREATE TYPE "UploadSource" AS ENUM ('USER_UPLOADED', 'AI_GENERATED');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('CLEANSER', 'TONER', 'SERUM', 'MOISTURIZER', 'EYE_CREAM', 'SPF', 'MASK', 'EXFOLIANT', 'FACIAL_OIL', 'MIST', 'SPOT_TREATMENT', 'BODY_WASH', 'BODY_MOISTURIZER', 'BODY_OIL', 'BODY_SCRUB', 'BODY_TREATMENT', 'BODY_SPF', 'SHAMPOO', 'CONDITIONER', 'HAIR_MASK', 'SCALP_TREATMENT', 'LEAVE_IN', 'HAIR_OIL', 'STYLING', 'PRIMER', 'FOUNDATION', 'CONCEALER', 'BLUSH_BRONZER', 'EYE_MAKEUP', 'LIP_COLOR', 'SETTING_SPRAY', 'SETTING_POWDER', 'COLOR_CORRECTOR', 'EAU_DE_PARFUM', 'EAU_DE_TOILETTE', 'BODY_MIST_SCENTED', 'HAIR_MIST', 'NAIL_TREATMENT', 'NAIL_COLOR', 'CUTICLE_OIL', 'BASE_COAT', 'TOP_COAT', 'SUPPLEMENT', 'COLLAGEN', 'LIP_BALM', 'LIP_TREATMENT', 'LIP_PLUMPER', 'LASH_SERUM', 'BROW_SERUM', 'EYE_PATCHES', 'BALM', 'OTHER');

-- CreateEnum
CREATE TYPE "SkinConcern" AS ENUM ('ACNE', 'HYPERPIGMENTATION', 'AGING', 'SENSITIVITY', 'DRYNESS', 'OILINESS', 'REDNESS', 'DULLNESS', 'UNEVEN_TEXTURE', 'DARK_CIRCLES', 'PORES', 'DEHYDRATION');

-- CreateEnum
CREATE TYPE "SkinType" AS ENUM ('DRY', 'OILY', 'COMBINATION', 'NORMAL', 'SENSITIVE');

-- CreateEnum
CREATE TYPE "ClimateType" AS ENUM ('TROPICAL', 'DRY_ARID', 'TEMPERATE', 'CONTINENTAL', 'POLAR', 'MEDITERRANEAN');

-- CreateEnum
CREATE TYPE "HumidityLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH');

-- CreateEnum
CREATE TYPE "RoutineFormat" AS ENUM ('SINGLE', 'ROUTINE');

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('AM', 'PM', 'BOTH', 'WASH_DAY', 'BETWEEN_WASH', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "SkinSymptom" AS ENUM ('BREAKOUT', 'DRYNESS', 'REDNESS', 'IRRITATION', 'PURGING', 'OILINESS', 'DULLNESS', 'IMPROVEMENT', 'GLOW', 'HYDRATED', 'TEXTURE_SMOOTH', 'HYPERPIGMENTATION_FADING');

-- CreateEnum
CREATE TYPE "ProductReaction" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "CrystalAdminRole" AS ENUM ('BRAND', 'HALITE');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ConsumerEventType" AS ENUM ('OUTCOME_LOGGED', 'TRANSACTION_COMPLETED', 'PREFERENCE_UPDATED', 'PRODUCT_TRACKED');

-- CreateEnum
CREATE TYPE "ConsumerEventSource" AS ENUM ('AURA', 'SHOPIFY', 'ECOMM_INTEGRATION');

-- CreateEnum
CREATE TYPE "AgentWorkflowType" AS ENUM ('ROUTINE_OUTCOME', 'CHURN_PREDICTION', 'PRODUCT_INTELLIGENCE', 'CONVERSION', 'EXECUTIVE_INTELLIGENCE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "halite_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "halite_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "plan" "BrandPlan" NOT NULL DEFAULT 'STARTER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "focusAreas" "BeautyArea"[],
    "shopifyShop" TEXT,
    "shopifyToken" TEXT,
    "shopifyWebhookSecret" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#000000',
    "type" "BrandType" NOT NULL DEFAULT 'ONBOARDED',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "demoProspectName" TEXT,
    "demoCreatedBy" TEXT,
    "demoLinkExpiresAt" TIMESTAMP(3),
    "demoConvertedAt" TIMESTAMP(3),
    "whiteLabelEnabled" BOOLEAN NOT NULL DEFAULT false,
    "brandWebsiteUrl" TEXT,
    "brandThemeConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_admins" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "AdminRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_events" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "ip" TEXT,
    "method" "LoginMethod" NOT NULL DEFAULT 'LOGIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_configs" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "enabledAreas" "BeautyArea"[],
    "questionOverrides" JSONB NOT NULL DEFAULT '{}',
    "customQuestions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_uploads" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "format" "CatalogFormat" NOT NULL,
    "source" "UploadSource" NOT NULL DEFAULT 'USER_UPLOADED',
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "rowCount" INTEGER,
    "errorLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "catalog_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ProductCategory" NOT NULL,
    "subcategory" TEXT,
    "beautyArea" "BeautyArea" NOT NULL DEFAULT 'SKINCARE',
    "concerns" "SkinConcern"[],
    "monkSkinTones" INTEGER[],
    "skinTypes" "SkinType"[],
    "ingredients" TEXT[],
    "keyIngredients" TEXT[],
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "imageUrl" TEXT,
    "productUrl" TEXT,
    "shopifyVariantId" TEXT,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumers" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "birthday" TIMESTAMP(3),
    "prefillAnswers" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "end_users" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "consumerId" TEXT,
    "externalId" TEXT,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "end_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_beauty_profiles" (
    "id" TEXT NOT NULL,
    "endUserId" TEXT NOT NULL,
    "completedAreas" "BeautyArea"[],
    "city" TEXT,
    "country" TEXT,
    "countryCode" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "timezone" TEXT,
    "detectedCurrency" TEXT DEFAULT 'USD',
    "climateTag" "ClimateType",
    "climateSnapshot" JSONB,
    "routineFormat" "RoutineFormat",
    "selectedCategories" "ProductCategory"[],
    "spendMin" DOUBLE PRECISION,
    "spendMax" DOUBLE PRECISION,
    "spendCurrency" TEXT DEFAULT 'USD',
    "waterIntakeMl" TEXT,
    "sleepHours" TEXT,
    "stressLevel" INTEGER,
    "ageRange" TEXT,
    "monkSkinTone" INTEGER,
    "skinType" "SkinType",
    "skinConcerns" "SkinConcern"[],
    "bodyProfile" JSONB,
    "hairProfile" JSONB,
    "makeupProfile" JSONB,
    "fragranceProfile" JSONB,
    "nailsProfile" JSONB,
    "wellnessProfile" JSONB,
    "sunCareProfile" JSONB,
    "lipProfile" JSONB,
    "eyeProfile" JSONB,
    "progressNarrative" TEXT,
    "narrativeUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_beauty_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_sessions" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "endUserId" TEXT,
    "selectedAreas" "BeautyArea"[],
    "answers" JSONB NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routines" (
    "id" TEXT NOT NULL,
    "endUserId" TEXT NOT NULL,
    "quizSessionId" TEXT NOT NULL,
    "focusArea" "BeautyArea" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "rationale" TEXT,
    "aiPromptTokens" INTEGER,
    "reorderDue" TIMESTAMP(3),
    "supersededBy" TEXT,
    "activeTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_steps" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "timeOfDay" "TimeOfDay" NOT NULL,
    "step" INTEGER NOT NULL,
    "instruction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "endUserId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "skinRating" INTEGER NOT NULL,
    "photoUrl" TEXT,
    "symptoms" "SkinSymptom"[],
    "notes" TEXT,
    "compliant" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in_products" (
    "id" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT true,
    "reaction" "ProductReaction",

    CONSTRAINT "check_in_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crystal_conversations" (
    "id" TEXT NOT NULL,
    "brandId" TEXT,
    "adminId" TEXT NOT NULL,
    "adminRole" "CrystalAdminRole" NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New conversation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crystal_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crystal_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crystal_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "period" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumer_events" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "consumerId" TEXT,
    "auraUserId" TEXT NOT NULL,
    "type" "ConsumerEventType" NOT NULL,
    "source" "ConsumerEventSource" NOT NULL DEFAULT 'AURA',
    "data" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumer_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_workflows" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AgentWorkflowType" NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrebuilt" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "tokenCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "halite_admins_email_key" ON "halite_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "brands_apiKey_key" ON "brands"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "brands_shopifyShop_key" ON "brands"("shopifyShop");

-- CreateIndex
CREATE UNIQUE INDEX "brand_admins_email_key" ON "brand_admins"("email");

-- CreateIndex
CREATE INDEX "login_events_brandId_createdAt_idx" ON "login_events"("brandId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_configs_brandId_key" ON "quiz_configs"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "products_brandId_externalId_key" ON "products"("brandId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "consumers_email_key" ON "consumers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "consumers_phone_key" ON "consumers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "end_users_brandId_externalId_key" ON "end_users"("brandId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "user_beauty_profiles_endUserId_key" ON "user_beauty_profiles"("endUserId");

-- CreateIndex
CREATE UNIQUE INDEX "routine_steps_routineId_timeOfDay_step_key" ON "routine_steps"("routineId", "timeOfDay", "step");

-- CreateIndex
CREATE INDEX "crystal_conversations_brandId_idx" ON "crystal_conversations"("brandId");

-- CreateIndex
CREATE INDEX "crystal_conversations_adminId_idx" ON "crystal_conversations"("adminId");

-- CreateIndex
CREATE INDEX "crystal_messages_conversationId_idx" ON "crystal_messages"("conversationId");

-- CreateIndex
CREATE INDEX "consumer_events_brandId_type_occurredAt_idx" ON "consumer_events"("brandId", "type", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "consumer_events_consumerId_occurredAt_idx" ON "consumer_events"("consumerId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "agent_workflows_brandId_idx" ON "agent_workflows"("brandId");

-- CreateIndex
CREATE INDEX "agent_runs_workflowId_idx" ON "agent_runs"("workflowId");

-- AddForeignKey
ALTER TABLE "brand_admins" ADD CONSTRAINT "brand_admins_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_events" ADD CONSTRAINT "login_events_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_events" ADD CONSTRAINT "login_events_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "brand_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_configs" ADD CONSTRAINT "quiz_configs_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_uploads" ADD CONSTRAINT "catalog_uploads_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_users" ADD CONSTRAINT "end_users_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_users" ADD CONSTRAINT "end_users_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_beauty_profiles" ADD CONSTRAINT "user_beauty_profiles_endUserId_fkey" FOREIGN KEY ("endUserId") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_endUserId_fkey" FOREIGN KEY ("endUserId") REFERENCES "end_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_endUserId_fkey" FOREIGN KEY ("endUserId") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_quizSessionId_fkey" FOREIGN KEY ("quizSessionId") REFERENCES "quiz_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_steps" ADD CONSTRAINT "routine_steps_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_steps" ADD CONSTRAINT "routine_steps_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_endUserId_fkey" FOREIGN KEY ("endUserId") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_products" ADD CONSTRAINT "check_in_products_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_products" ADD CONSTRAINT "check_in_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crystal_conversations" ADD CONSTRAINT "crystal_conversations_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crystal_messages" ADD CONSTRAINT "crystal_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "crystal_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_events" ADD CONSTRAINT "consumer_events_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumer_events" ADD CONSTRAINT "consumer_events_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "consumers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_workflows" ADD CONSTRAINT "agent_workflows_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "agent_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
