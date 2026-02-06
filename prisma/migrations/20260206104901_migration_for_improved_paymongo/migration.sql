/*
  Warnings:

  - A unique constraint covering the columns `[paymongo_checkout_session_id]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paymongo_payment_intent_id]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paymongo_checkout_session_id" TEXT,
ADD COLUMN     "paymongo_payment_id" TEXT,
ADD COLUMN     "paymongo_payment_intent_id" TEXT,
ADD COLUMN     "paymongo_payment_method_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_paymongo_checkout_session_id_key" ON "Booking"("paymongo_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_paymongo_payment_intent_id_key" ON "Booking"("paymongo_payment_intent_id");
