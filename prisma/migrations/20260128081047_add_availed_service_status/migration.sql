-- CreateEnum
CREATE TYPE "AvailedServiceStatus" AS ENUM ('PENDING', 'CLAIMED', 'SERVING', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "AvailedService" ADD COLUMN     "claimed_at" TIMESTAMP(3),
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "served_at" TIMESTAMP(3),
ADD COLUMN     "status" "AvailedServiceStatus" NOT NULL DEFAULT 'PENDING';
