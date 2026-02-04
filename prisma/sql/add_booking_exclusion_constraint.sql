-- PostgreSQL Exclusion Constraint for Double-Booking Prevention
-- ================================================================
-- Uses triggers to maintain computed columns (avoiding IMMUTABLE issues)
--
-- Usage:
--   npx prisma db execute --file prisma/sql/add_booking_exclusion_constraint.sql

-- Enable range comparison operators
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Step 1: Add regular columns (not generated) for the constraint
ALTER TABLE "Booking" 
DROP COLUMN IF EXISTS booking_range CASCADE;

ALTER TABLE "Booking" 
ADD COLUMN IF NOT EXISTS booking_range tstzrange;

ALTER TABLE "Booking"
DROP COLUMN IF EXISTS is_active_booking CASCADE;

ALTER TABLE "Booking"
ADD COLUMN IF NOT EXISTS is_active_booking boolean DEFAULT true;

-- Step 2: Create function to update the computed columns
CREATE OR REPLACE FUNCTION update_booking_computed_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Update booking_range
  IF NEW.scheduled_at IS NOT NULL AND NEW.estimated_end IS NOT NULL THEN
    NEW.booking_range := tstzrange(NEW.scheduled_at, NEW.estimated_end, '[)');
  ELSE
    NEW.booking_range := NULL;
  END IF;
  
  -- Update is_active_booking (false for CANCELLED)
  NEW.is_active_booking := (NEW.status::text != 'CANCELLED');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to run before insert/update
DROP TRIGGER IF EXISTS booking_computed_columns_trigger ON "Booking";

CREATE TRIGGER booking_computed_columns_trigger
BEFORE INSERT OR UPDATE ON "Booking"
FOR EACH ROW
EXECUTE FUNCTION update_booking_computed_columns();

-- Step 4: Backfill existing bookings
UPDATE "Booking" SET
  booking_range = CASE 
    WHEN scheduled_at IS NOT NULL AND estimated_end IS NOT NULL 
    THEN tstzrange(scheduled_at, estimated_end, '[)')
    ELSE NULL
  END,
  is_active_booking = (status::text != 'CANCELLED');

-- Step 5: Create the exclusion constraint
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS no_overlapping_bookings;

ALTER TABLE "Booking" 
ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING GIST (
  business_id WITH =,
  booking_range WITH &&
) WHERE (is_active_booking = true AND booking_range IS NOT NULL);

-- Done! The trigger will automatically maintain these columns on insert/update.
