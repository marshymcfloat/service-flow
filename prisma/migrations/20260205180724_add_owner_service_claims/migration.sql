-- CreateEnum
CREATE TYPE "ServiceProviderType" AS ENUM ('EMPLOYEE', 'OWNER');

-- AlterTable
ALTER TABLE "AvailedService" ADD COLUMN     "served_by_owner_id" INTEGER,
ADD COLUMN     "served_by_type" "ServiceProviderType";

-- CreateIndex
CREATE INDEX "AvailedService_served_by_owner_id_status_idx" ON "AvailedService"("served_by_owner_id", "status");

-- AddForeignKey
ALTER TABLE "AvailedService" ADD CONSTRAINT "AvailedService_served_by_owner_id_fkey" FOREIGN KEY ("served_by_owner_id") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
