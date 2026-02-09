import { Prisma } from "@/prisma/generated/prisma/client";
export type OutboxEventType =
  | "BOOKING_CREATED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "PAYMENT_CONFIRMED"
  | "REMINDER_DUE"
  | "PAYSLIP_GENERATED"
  | "FLOW_REMINDER_SENT";

export interface OutboxEvent {
  type: OutboxEventType;
  aggregateType: string;
  aggregateId: string;
  businessId: string;
  payload: Record<string, unknown>;
}

/**
 * Publishes an event to the outbox within the same transaction.
 * This ensures the event is recorded if and only if the transaction commits.
 *
 * @example
 * await prisma.$transaction(async (tx) => {
 *   const booking = await tx.booking.create({ ... });
 *   await publishEvent(tx, {
 *     type: 'BOOKING_CREATED',
 *     aggregateType: 'Booking',
 *     aggregateId: String(booking.id),
 *     businessId: business.id,
 *     payload: { customerName, email, scheduledAt }
 *   });
 * });
 */
export async function publishEvent(
  tx: Prisma.TransactionClient,
  event: OutboxEvent,
) {
  return tx.outboxMessage.create({
    data: {
      event_type: event.type,
      aggregate_type: event.aggregateType,
      aggregate_id: event.aggregateId,
      business_id: event.businessId,
      payload: event.payload as Prisma.JsonObject,
    },
  });
}

/**
 * Publishes multiple events to the outbox within the same transaction.
 */
export async function publishEvents(
  tx: Prisma.TransactionClient,
  events: OutboxEvent[],
) {
  return Promise.all(events.map((event) => publishEvent(tx, event)));
}
