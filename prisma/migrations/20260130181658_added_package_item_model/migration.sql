/*
  Warnings:

  - You are about to drop the `_ServiceToServicePackage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ServiceToServicePackage" DROP CONSTRAINT "_ServiceToServicePackage_A_fkey";

-- DropForeignKey
ALTER TABLE "_ServiceToServicePackage" DROP CONSTRAINT "_ServiceToServicePackage_B_fkey";

-- DropTable
DROP TABLE "_ServiceToServicePackage";

-- CreateTable
CREATE TABLE "PackageItem" (
    "id" SERIAL NOT NULL,
    "custom_price" DOUBLE PRECISION NOT NULL,
    "package_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,

    CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PackageItem_package_id_service_id_key" ON "PackageItem"("package_id", "service_id");

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "ServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
