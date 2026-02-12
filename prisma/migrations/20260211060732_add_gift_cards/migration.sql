-- CreateTable
CREATE TABLE "GiftCard" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimed_at" TIMESTAMP(3),
    "claimed_by_customer_id" TEXT,
    "business_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardService" (
    "id" SERIAL NOT NULL,
    "gift_card_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,

    CONSTRAINT "GiftCardService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardPackage" (
    "id" SERIAL NOT NULL,
    "gift_card_id" INTEGER NOT NULL,
    "package_id" INTEGER NOT NULL,

    CONSTRAINT "GiftCardPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_code_key" ON "GiftCard"("code");

-- CreateIndex
CREATE INDEX "GiftCard_business_id_created_at_idx" ON "GiftCard"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "GiftCard_business_id_customer_email_idx" ON "GiftCard"("business_id", "customer_email");

-- CreateIndex
CREATE INDEX "GiftCard_business_id_expires_at_idx" ON "GiftCard"("business_id", "expires_at");

-- CreateIndex
CREATE INDEX "GiftCardService_service_id_idx" ON "GiftCardService"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardService_gift_card_id_service_id_key" ON "GiftCardService"("gift_card_id", "service_id");

-- CreateIndex
CREATE INDEX "GiftCardPackage_package_id_idx" ON "GiftCardPackage"("package_id");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardPackage_gift_card_id_package_id_key" ON "GiftCardPackage"("gift_card_id", "package_id");

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_claimed_by_customer_id_fkey" FOREIGN KEY ("claimed_by_customer_id") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardService" ADD CONSTRAINT "GiftCardService_gift_card_id_fkey" FOREIGN KEY ("gift_card_id") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardService" ADD CONSTRAINT "GiftCardService_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardPackage" ADD CONSTRAINT "GiftCardPackage_gift_card_id_fkey" FOREIGN KEY ("gift_card_id") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardPackage" ADD CONSTRAINT "GiftCardPackage_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "ServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
