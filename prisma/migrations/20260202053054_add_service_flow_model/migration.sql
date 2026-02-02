-- CreateEnum
CREATE TYPE "FlowDelayUnit" AS ENUM ('DAYS', 'WEEKS', 'MONTHS');

-- CreateEnum
CREATE TYPE "FlowType" AS ENUM ('REQUIRED', 'SUGGESTED');

-- CreateTable
CREATE TABLE "ServiceFlow" (
    "id" TEXT NOT NULL,
    "trigger_service_id" INTEGER NOT NULL,
    "suggested_service_id" INTEGER NOT NULL,
    "delay_duration" INTEGER NOT NULL,
    "delay_unit" "FlowDelayUnit" NOT NULL,
    "type" "FlowType" NOT NULL DEFAULT 'SUGGESTED',
    "business_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceFlow_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ServiceFlow" ADD CONSTRAINT "ServiceFlow_trigger_service_id_fkey" FOREIGN KEY ("trigger_service_id") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceFlow" ADD CONSTRAINT "ServiceFlow_suggested_service_id_fkey" FOREIGN KEY ("suggested_service_id") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceFlow" ADD CONSTRAINT "ServiceFlow_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
