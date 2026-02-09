-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "AuditLog_actor_id_idx" ON "AuditLog"("actor_id");

-- CreateIndex
CREATE INDEX "AvailedService_booking_id_idx" ON "AvailedService"("booking_id");

-- CreateIndex
CREATE INDEX "AvailedService_service_id_idx" ON "AvailedService"("service_id");

-- CreateIndex
CREATE INDEX "AvailedService_package_id_idx" ON "AvailedService"("package_id");

-- CreateIndex
CREATE INDEX "AvailedService_served_by_id_idx" ON "AvailedService"("served_by_id");

-- CreateIndex
CREATE INDEX "AvailedService_served_by_owner_id_idx" ON "AvailedService"("served_by_owner_id");

-- CreateIndex
CREATE INDEX "Booking_business_id_status_idx" ON "Booking"("business_id", "status");

-- CreateIndex
CREATE INDEX "Booking_customer_id_idx" ON "Booking"("customer_id");

-- CreateIndex
CREATE INDEX "Booking_created_at_idx" ON "Booking"("created_at");

-- CreateIndex
CREATE INDEX "Booking_scheduled_at_idx" ON "Booking"("scheduled_at");

-- CreateIndex
CREATE INDEX "Business_slug_idx" ON "Business"("slug");

-- CreateIndex
CREATE INDEX "Customer_business_id_email_idx" ON "Customer"("business_id", "email");

-- CreateIndex
CREATE INDEX "Customer_business_id_phone_idx" ON "Customer"("business_id", "phone");

-- CreateIndex
CREATE INDEX "Employee_business_id_idx" ON "Employee"("business_id");

-- CreateIndex
CREATE INDEX "OutboxMessage_event_type_idx" ON "OutboxMessage"("event_type");

-- CreateIndex
CREATE INDEX "ServiceFlow_trigger_service_id_idx" ON "ServiceFlow"("trigger_service_id");

-- CreateIndex
CREATE INDEX "ServiceFlow_suggested_service_id_idx" ON "ServiceFlow"("suggested_service_id");

-- CreateIndex
CREATE INDEX "ServiceFlow_business_id_idx" ON "ServiceFlow"("business_id");
