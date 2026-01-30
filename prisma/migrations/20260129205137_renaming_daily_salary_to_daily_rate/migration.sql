/*
  Warnings:

  - The values [PENDING,REJECTED,RESCHEDULED,DOWNPAYMENT_PENDING,DOWNPAYMENT_PAID,REFUNDED] on the enum `BookingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `daily_salary` on the `Employee` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('ACCEPTED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."Booking" ALTER COLUMN "downpayment_status" DROP DEFAULT;
ALTER TABLE "public"."Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TABLE "Booking" ALTER COLUMN "downpayment_status" TYPE "BookingStatus_new" USING ("downpayment_status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "public"."BookingStatus_old";
ALTER TABLE "Booking" ALTER COLUMN "downpayment_status" SET DEFAULT 'ACCEPTED';
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'ACCEPTED';
COMMIT;

-- AlterTable
ALTER TABLE "AvailedService" ADD COLUMN     "cancelled_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'ACCEPTED',
ALTER COLUMN "downpayment_status" SET DEFAULT 'ACCEPTED';

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "daily_salary",
ADD COLUMN     "daily_rate" DOUBLE PRECISION NOT NULL DEFAULT 0;
