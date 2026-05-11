import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export {
  PrismaClient,
  Prisma,
  BrandPlan,
  BeautyArea,
  AdminRole,
  CatalogFormat,
  UploadStatus,
  ProductCategory,
  SkinConcern,
  SkinType,
  InvoiceStatus,
  ClimateType,
  RoutineFormat,
  TimeOfDay,
  SkinSymptom,
  ProductReaction,
} from '@prisma/client'
export type {
  Brand,
  BrandAdmin,
  QuizConfig,
  CatalogUpload,
  Product,
  EndUser,
  UserBeautyProfile,
  QuizSession,
  Routine,
  RoutineStep,
  CheckIn,
  CheckInProduct,
} from '@prisma/client'
