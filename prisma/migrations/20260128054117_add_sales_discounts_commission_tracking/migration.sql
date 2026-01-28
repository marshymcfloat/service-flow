/*
  Warnings:

  - Added the required column `commission_base` to the `AvailedService` table without a default value. This is not possible if the table is not empty.
  - Added the required column `final_price` to the `AvailedService` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FLAT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'QRPH');

-- DropForeignKey
ALTER TABLE "AvailedService" DROP CONSTRAINT "AvailedService_served_by_id_fkey";

-- AlterTable
ALTER TABLE "AvailedService" ADD COLUMN     "commission_base" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "discount_reason" TEXT,
ADD COLUMN     "final_price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "package_id" INTEGER;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "SaleEvent" ADD COLUMN     "discount_type" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "discount_value" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "category" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ServicePackage" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER,
    "category" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SaleEventToService" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_SaleEventToService_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SaleEventToServicePackage" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_SaleEventToServicePackage_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ServiceToServicePackage" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ServiceToServicePackage_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SaleEventToService_B_index" ON "_SaleEventToService"("B");

-- CreateIndex
CREATE INDEX "_SaleEventToServicePackage_B_index" ON "_SaleEventToServicePackage"("B");

-- CreateIndex
CREATE INDEX "_ServiceToServicePackage_B_index" ON "_ServiceToServicePackage"("B");

-- AddForeignKey
ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailedService" ADD CONSTRAINT "AvailedService_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "ServicePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailedService" ADD CONSTRAINT "AvailedService_served_by_id_fkey" FOREIGN KEY ("served_by_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SaleEventToService" ADD CONSTRAINT "_SaleEventToService_A_fkey" FOREIGN KEY ("A") REFERENCES "SaleEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SaleEventToService" ADD CONSTRAINT "_SaleEventToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SaleEventToServicePackage" ADD CONSTRAINT "_SaleEventToServicePackage_A_fkey" FOREIGN KEY ("A") REFERENCES "SaleEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SaleEventToServicePackage" ADD CONSTRAINT "_SaleEventToServicePackage_B_fkey" FOREIGN KEY ("B") REFERENCES "ServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceToServicePackage" ADD CONSTRAINT "_ServiceToServicePackage_A_fkey" FOREIGN KEY ("A") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceToServicePackage" ADD CONSTRAINT "_ServiceToServicePackage_B_fkey" FOREIGN KEY ("B") REFERENCES "ServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
