-- CreateEnum
CREATE TYPE "OnboardingApplicationStatus" AS ENUM ('NEW', 'CONTACTED', 'APPROVED', 'REJECTED', 'CONVERTED');

-- CreateTable
CREATE TABLE "OnboardingApplication" (
    "id" TEXT NOT NULL,
    "business_name" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "owner_phone" TEXT,
    "notes" TEXT,
    "referral_code_input" TEXT,
    "referral_code_id" TEXT,
    "status" "OnboardingApplicationStatus" NOT NULL DEFAULT 'NEW',
    "review_notes" TEXT,
    "reviewed_by_user_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "converted_business_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnboardingApplication_status_created_at_idx" ON "OnboardingApplication"("status", "created_at");

-- CreateIndex
CREATE INDEX "OnboardingApplication_owner_email_idx" ON "OnboardingApplication"("owner_email");

-- CreateIndex
CREATE INDEX "OnboardingApplication_referral_code_id_idx" ON "OnboardingApplication"("referral_code_id");

-- AddForeignKey
ALTER TABLE "OnboardingApplication" ADD CONSTRAINT "OnboardingApplication_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "ReferralCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingApplication" ADD CONSTRAINT "OnboardingApplication_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingApplication" ADD CONSTRAINT "OnboardingApplication_converted_business_id_fkey" FOREIGN KEY ("converted_business_id") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
