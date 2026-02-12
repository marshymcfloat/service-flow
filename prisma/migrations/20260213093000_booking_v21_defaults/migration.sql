ALTER TABLE "Business"
ALTER COLUMN "booking_v2_enabled" SET DEFAULT true;

ALTER TABLE "Business"
ADD COLUMN "same_day_attendance_strict_minutes" INTEGER NOT NULL DEFAULT 120;

UPDATE "Business"
SET "booking_v2_enabled" = true
WHERE "booking_v2_enabled" = false;
