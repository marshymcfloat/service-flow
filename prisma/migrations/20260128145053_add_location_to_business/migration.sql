-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "EmployeeAttendance" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "location_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "time_in" TIMESTAMP(3),
ADD COLUMN     "time_out" TIMESTAMP(3);
