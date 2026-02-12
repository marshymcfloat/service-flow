CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');
CREATE TYPE "BookingPaymentType" AS ENUM ('FULL', 'DOWNPAYMENT', 'BALANCE', 'MANUAL');
CREATE TYPE "BookingPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELED');

ALTER TABLE "Booking"
ADD COLUMN "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN "amount_paid" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "Booking"
SET "amount_paid" = CASE
  WHEN "status" = 'HOLD' THEN 0
  WHEN COALESCE("downpayment", 0) > 0 THEN LEAST("grand_total", COALESCE("downpayment", 0))
  WHEN "payment_method" = 'CASH' AND "status" = 'COMPLETED' THEN "grand_total"
  WHEN "payment_method" = 'QRPH' AND "status" IN ('ACCEPTED', 'COMPLETED') THEN "grand_total"
  ELSE 0
END;

UPDATE "Booking"
SET "payment_status" = CASE
  WHEN "amount_paid" >= "grand_total" THEN 'PAID'::"PaymentStatus"
  WHEN "amount_paid" > 0 THEN 'PARTIALLY_PAID'::"PaymentStatus"
  ELSE 'UNPAID'::"PaymentStatus"
END;

CREATE TABLE "BookingPayment" (
  "id" SERIAL NOT NULL,
  "booking_id" INTEGER NOT NULL,
  "type" "BookingPaymentType" NOT NULL,
  "status" "BookingPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "payment_method" "PaymentMethod" NOT NULL DEFAULT 'QRPH',
  "amount_principal" DOUBLE PRECISION NOT NULL,
  "amount_charged" DOUBLE PRECISION NOT NULL,
  "paymongo_payment_intent_id" TEXT,
  "paymongo_payment_method_id" TEXT,
  "paymongo_payment_id" TEXT,
  "expires_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingPayment_paymongo_payment_intent_id_key" ON "BookingPayment"("paymongo_payment_intent_id");
CREATE UNIQUE INDEX "BookingPayment_paymongo_payment_id_key" ON "BookingPayment"("paymongo_payment_id");
CREATE INDEX "BookingPayment_booking_id_status_idx" ON "BookingPayment"("booking_id", "status");
CREATE INDEX "BookingPayment_created_at_idx" ON "BookingPayment"("created_at");

ALTER TABLE "BookingPayment"
ADD CONSTRAINT "BookingPayment_booking_id_fkey"
FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
