-- CreateEnum
CREATE TYPE "CommissionCalculationBasis" AS ENUM ('ORIGINAL_PRICE', 'DISCOUNTED_PRICE');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "commission_calculation_basis" "CommissionCalculationBasis" NOT NULL DEFAULT 'ORIGINAL_PRICE';
