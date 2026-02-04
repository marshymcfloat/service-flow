/*
  Warnings:

  - A unique constraint covering the columns `[business_id,day_of_week,category]` on the table `BusinessHours` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "BusinessHours_business_id_day_of_week_key";

-- AlterTable
ALTER TABLE "BusinessHours" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "BusinessHours_business_id_day_of_week_category_key" ON "BusinessHours"("business_id", "day_of_week", "category");
