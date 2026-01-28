/*
  Warnings:

  - You are about to drop the column `total` on the `Booking` table. All the data in the column will be lost.
  - Added the required column `grand_total` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total_discount` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `salary` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('PERCENTAGE', 'FLAT');

-- CreateEnum
CREATE TYPE "PayslipStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'OFF');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "AvailedService" ADD COLUMN     "served_by_id" INTEGER;

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "total",
ADD COLUMN     "downpayment" DOUBLE PRECISION,
ADD COLUMN     "downpayment_date" TIMESTAMP(3),
ADD COLUMN     "downpayment_status" "BookingStatus" DEFAULT 'PENDING',
ADD COLUMN     "grand_total" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "total_discount" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "commission_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "daily_salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "salary" DOUBLE PRECISION NOT NULL;

-- CreateTable
CREATE TABLE "SaleEvent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "business_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAttendance" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "starting_date" TIMESTAMP(3) NOT NULL,
    "ending_date" TIMESTAMP(3) NOT NULL,
    "comment" TEXT,
    "deduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "PayslipStatus" NOT NULL DEFAULT 'PENDING',
    "total_salary" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialDate" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "salary_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "commission_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "business_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "type" "VoucherType" NOT NULL DEFAULT 'PERCENTAGE',
    "minimum_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_by_id" INTEGER,
    "business_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- AddForeignKey
ALTER TABLE "SaleEvent" ADD CONSTRAINT "SaleEvent_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAttendance" ADD CONSTRAINT "EmployeeAttendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialDate" ADD CONSTRAINT "SpecialDate_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_used_by_id_fkey" FOREIGN KEY ("used_by_id") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailedService" ADD CONSTRAINT "AvailedService_served_by_id_fkey" FOREIGN KEY ("served_by_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
