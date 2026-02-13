-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK_PAGE', 'INSTAGRAM_BUSINESS');

-- CreateEnum
CREATE TYPE "SocialConnectionStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'REVOKED', 'ERROR');

-- CreateEnum
CREATE TYPE "SocialPostSource" AS ENUM ('SALE_EVENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SocialTargetStatus" AS ENUM ('QUEUED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "SocialConnection" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "external_account_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "username" TEXT,
    "access_token_encrypted" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "SocialConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "sale_event_id" INTEGER,
    "source" "SocialPostSource" NOT NULL,
    "status" "SocialPostStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "caption_draft" TEXT NOT NULL,
    "caption_final" TEXT,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "media_url" TEXT,
    "created_by_user_id" TEXT,
    "publish_requested_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPostTarget" (
    "id" TEXT NOT NULL,
    "social_post_id" TEXT NOT NULL,
    "social_connection_id" TEXT NOT NULL,
    "status" "SocialTargetStatus" NOT NULL DEFAULT 'SKIPPED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "remote_post_id" TEXT,
    "remote_permalink" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPostTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialConnection_business_id_status_idx" ON "SocialConnection"("business_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SocialConnection_business_id_platform_key" ON "SocialConnection"("business_id", "platform");

-- CreateIndex
CREATE INDEX "SocialPost_business_id_status_created_at_idx" ON "SocialPost"("business_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "SocialPost_sale_event_id_idx" ON "SocialPost"("sale_event_id");

-- CreateIndex
CREATE INDEX "SocialPostTarget_status_attempts_created_at_idx" ON "SocialPostTarget"("status", "attempts", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPostTarget_social_post_id_social_connection_id_key" ON "SocialPostTarget"("social_post_id", "social_connection_id");

-- AddForeignKey
ALTER TABLE "SocialConnection" ADD CONSTRAINT "SocialConnection_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_sale_event_id_fkey" FOREIGN KEY ("sale_event_id") REFERENCES "SaleEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostTarget" ADD CONSTRAINT "SocialPostTarget_social_post_id_fkey" FOREIGN KEY ("social_post_id") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostTarget" ADD CONSTRAINT "SocialPostTarget_social_connection_id_fkey" FOREIGN KEY ("social_connection_id") REFERENCES "SocialConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
