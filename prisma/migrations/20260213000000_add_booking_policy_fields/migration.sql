-- AlterTable
ALTER TABLE "Business"
ADD COLUMN "booking_horizon_days" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN "booking_min_lead_minutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "booking_slot_interval_minutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "public_allow_full_payment" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "public_allow_downpayment" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "public_default_payment_type" TEXT NOT NULL DEFAULT 'FULL',
ADD COLUMN "booking_v2_enabled" BOOLEAN NOT NULL DEFAULT false;

