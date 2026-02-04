-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "booking_range" TEXT,
ADD COLUMN     "is_active_booking" BOOLEAN;

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "imageUrl" TEXT;
