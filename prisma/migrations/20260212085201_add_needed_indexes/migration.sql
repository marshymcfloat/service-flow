-- CreateIndex
CREATE INDEX "AuditLog_entity_type_entity_id_action_idx" ON "AuditLog"("entity_type", "entity_id", "action");

-- CreateIndex
CREATE INDEX "AvailedService_served_by_id_status_completed_at_idx" ON "AvailedService"("served_by_id", "status", "completed_at");

-- CreateIndex
CREATE INDEX "AvailedService_service_id_status_completed_at_idx" ON "AvailedService"("service_id", "status", "completed_at");

-- CreateIndex
CREATE INDEX "AvailedService_service_id_status_served_at_idx" ON "AvailedService"("service_id", "status", "served_at");

-- CreateIndex
CREATE INDEX "Booking_business_id_scheduled_at_idx" ON "Booking"("business_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "Booking_business_id_created_at_idx" ON "Booking"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "Booking_customer_id_business_id_scheduled_at_idx" ON "Booking"("customer_id", "business_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "Booking_status_hold_expires_at_idx" ON "Booking"("status", "hold_expires_at");

-- CreateIndex
CREATE INDEX "Booking_status_reminder_sent_scheduled_at_idx" ON "Booking"("status", "reminder_sent", "scheduled_at");

-- CreateIndex
CREATE INDEX "BookingPayment_status_payment_method_created_at_idx" ON "BookingPayment"("status", "payment_method", "created_at");

-- CreateIndex
CREATE INDEX "Customer_business_id_name_idx" ON "Customer"("business_id", "name");

-- CreateIndex
CREATE INDEX "EmployeeAttendance_employee_id_date_idx" ON "EmployeeAttendance"("employee_id", "date");

-- CreateIndex
CREATE INDEX "EmployeeAttendance_employee_id_status_date_idx" ON "EmployeeAttendance"("employee_id", "status", "date");

-- CreateIndex
CREATE INDEX "EmployeeAttendance_date_idx" ON "EmployeeAttendance"("date");

-- CreateIndex
CREATE INDEX "LeaveRequest_business_id_created_at_idx" ON "LeaveRequest"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "LeaveRequest_employee_id_created_at_idx" ON "LeaveRequest"("employee_id", "created_at");

-- CreateIndex
CREATE INDEX "LeaveRequest_employee_id_start_date_end_date_idx" ON "LeaveRequest"("employee_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "OutboxMessage_processed_attempts_created_at_idx" ON "OutboxMessage"("processed", "attempts", "created_at");

-- CreateIndex
CREATE INDEX "Payslip_employee_id_ending_date_idx" ON "Payslip"("employee_id", "ending_date");

-- CreateIndex
CREATE INDEX "Payslip_employee_id_status_ending_date_idx" ON "Payslip"("employee_id", "status", "ending_date");

-- CreateIndex
CREATE INDEX "SaleEvent_business_id_created_at_idx" ON "SaleEvent"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "SaleEvent_business_id_start_date_end_date_idx" ON "SaleEvent"("business_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "Service_business_id_category_name_idx" ON "Service"("business_id", "category", "name");

-- CreateIndex
CREATE INDEX "Service_business_id_name_idx" ON "Service"("business_id", "name");

-- CreateIndex
CREATE INDEX "ServicePackage_business_id_name_idx" ON "ServicePackage"("business_id", "name");

-- CreateIndex
CREATE INDEX "Voucher_business_id_created_at_idx" ON "Voucher"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "Voucher_used_by_id_idx" ON "Voucher"("used_by_id");
