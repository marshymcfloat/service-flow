-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CollectionMethod" AS ENUM ('MANUAL_CHECKOUT', 'AUTO_CHARGE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CreditSource" AS ENUM ('TRIAL_GRANT', 'REFERRAL_REWARD', 'ADMIN_ADJUSTMENT', 'MANUAL_COMP');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REWARDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'REJECTED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PLATFORM_ADMIN';

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "billing_interval" "BillingInterval" NOT NULL,
    "price_amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSubscription" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "collection_method" "CollectionMethod" NOT NULL DEFAULT 'MANUAL_CHECKOUT',
    "recurring_enabled" BOOLEAN NOT NULL DEFAULT false,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_ends_at" TIMESTAMP(3),
    "grace_ends_at" TIMESTAMP(3),
    "suspended_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPaymentMethod" (
    "id" TEXT NOT NULL,
    "business_subscription_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYMONGO',
    "provider_customer_id" TEXT,
    "provider_payment_method_id" TEXT,
    "provider_payment_intent_id" TEXT,
    "brand" TEXT,
    "last4" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionInvoice" (
    "id" TEXT NOT NULL,
    "business_subscription_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "reason" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "amount_subtotal" INTEGER NOT NULL,
    "amount_credit_applied" INTEGER NOT NULL DEFAULT 0,
    "amount_due" INTEGER NOT NULL,
    "amount_paid" INTEGER NOT NULL DEFAULT 0,
    "paymongo_checkout_session_id" TEXT,
    "paymongo_payment_intent_id" TEXT,
    "paymongo_payment_method_id" TEXT,
    "paymongo_payment_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionCreditLedger" (
    "id" TEXT NOT NULL,
    "business_subscription_id" TEXT NOT NULL,
    "source" "CreditSource" NOT NULL,
    "amount_total" INTEGER NOT NULL,
    "amount_remaining" INTEGER NOT NULL,
    "description" TEXT,
    "expires_at" TIMESTAMP(3),
    "awarded_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionCreditLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralLead" (
    "id" TEXT NOT NULL,
    "referral_code_id" TEXT NOT NULL,
    "referred_business_name" TEXT NOT NULL,
    "owner_name" TEXT NOT NULL,
    "owner_email" TEXT NOT NULL,
    "owner_phone" TEXT,
    "notes" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "converted_business_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralAttribution" (
    "id" TEXT NOT NULL,
    "referral_code_id" TEXT NOT NULL,
    "referrer_business_id" TEXT NOT NULL,
    "referred_business_id" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "qualified_at" TIMESTAMP(3),
    "rewarded_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "reward_credit_ledger_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformActionLog" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "business_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_is_active_idx" ON "SubscriptionPlan"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSubscription_business_id_key" ON "BusinessSubscription"("business_id");

-- CreateIndex
CREATE INDEX "BusinessSubscription_status_current_period_end_idx" ON "BusinessSubscription"("status", "current_period_end");

-- CreateIndex
CREATE INDEX "BusinessSubscription_plan_id_idx" ON "BusinessSubscription"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPaymentMethod_business_subscription_id_key" ON "SubscriptionPaymentMethod"("business_subscription_id");

-- CreateIndex
CREATE INDEX "SubscriptionPaymentMethod_provider_provider_customer_id_idx" ON "SubscriptionPaymentMethod"("provider", "provider_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_paymongo_checkout_session_id_key" ON "SubscriptionInvoice"("paymongo_checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_paymongo_payment_intent_id_key" ON "SubscriptionInvoice"("paymongo_payment_intent_id");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_business_subscription_id_status_idx" ON "SubscriptionInvoice"("business_subscription_id", "status");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_business_id_created_at_idx" ON "SubscriptionInvoice"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_due_at_status_idx" ON "SubscriptionInvoice"("due_at", "status");

-- CreateIndex
CREATE INDEX "SubscriptionCreditLedger_business_subscription_id_created_a_idx" ON "SubscriptionCreditLedger"("business_subscription_id", "created_at");

-- CreateIndex
CREATE INDEX "SubscriptionCreditLedger_amount_remaining_expires_at_idx" ON "SubscriptionCreditLedger"("amount_remaining", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_business_id_key" ON "ReferralCode"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralLead_status_created_at_idx" ON "ReferralLead"("status", "created_at");

-- CreateIndex
CREATE INDEX "ReferralLead_referral_code_id_created_at_idx" ON "ReferralLead"("referral_code_id", "created_at");

-- CreateIndex
CREATE INDEX "ReferralLead_owner_email_idx" ON "ReferralLead"("owner_email");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralAttribution_referred_business_id_key" ON "ReferralAttribution"("referred_business_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralAttribution_reward_credit_ledger_id_key" ON "ReferralAttribution"("reward_credit_ledger_id");

-- CreateIndex
CREATE INDEX "ReferralAttribution_referrer_business_id_status_idx" ON "ReferralAttribution"("referrer_business_id", "status");

-- CreateIndex
CREATE INDEX "ReferralAttribution_referred_business_id_status_idx" ON "ReferralAttribution"("referred_business_id", "status");

-- CreateIndex
CREATE INDEX "PlatformActionLog_created_at_idx" ON "PlatformActionLog"("created_at");

-- CreateIndex
CREATE INDEX "PlatformActionLog_business_id_created_at_idx" ON "PlatformActionLog"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "PlatformActionLog_action_created_at_idx" ON "PlatformActionLog"("action", "created_at");

-- AddForeignKey
ALTER TABLE "BusinessSubscription" ADD CONSTRAINT "BusinessSubscription_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSubscription" ADD CONSTRAINT "BusinessSubscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPaymentMethod" ADD CONSTRAINT "SubscriptionPaymentMethod_business_subscription_id_fkey" FOREIGN KEY ("business_subscription_id") REFERENCES "BusinessSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_business_subscription_id_fkey" FOREIGN KEY ("business_subscription_id") REFERENCES "BusinessSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCreditLedger" ADD CONSTRAINT "SubscriptionCreditLedger_business_subscription_id_fkey" FOREIGN KEY ("business_subscription_id") REFERENCES "BusinessSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionCreditLedger" ADD CONSTRAINT "SubscriptionCreditLedger_awarded_by_user_id_fkey" FOREIGN KEY ("awarded_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralLead" ADD CONSTRAINT "ReferralLead_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "ReferralCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralLead" ADD CONSTRAINT "ReferralLead_converted_business_id_fkey" FOREIGN KEY ("converted_business_id") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "ReferralCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_referrer_business_id_fkey" FOREIGN KEY ("referrer_business_id") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_referred_business_id_fkey" FOREIGN KEY ("referred_business_id") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralAttribution" ADD CONSTRAINT "ReferralAttribution_reward_credit_ledger_id_fkey" FOREIGN KEY ("reward_credit_ledger_id") REFERENCES "SubscriptionCreditLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformActionLog" ADD CONSTRAINT "PlatformActionLog_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformActionLog" ADD CONSTRAINT "PlatformActionLog_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
