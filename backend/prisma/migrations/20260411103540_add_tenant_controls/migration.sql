-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "api_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_suspended" BOOLEAN NOT NULL DEFAULT false;
