import { NextResponse, connection } from "next/server";
import { prisma } from "@/prisma/prisma";
import {
  isOutboxEventType,
  parseOutboxPayload,
} from "@/lib/services/outbox";
import { getCurrentDateTimePH } from "@/lib/date-utils";
import {
  deliverOutboxEvent,
  isNonRetryableOutboxError,
} from "@/lib/services/outbox-delivery";
import { logger } from "@/lib/logger";
import {
  isCronAuthorized,
  unauthorizedCronResponse,
} from "@/lib/security/cron-auth";

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 10;

type EventSummary = {
  processed: number;
  succeeded: number;
  failed: number;
  terminalFailures: number;
  skippedNonRetryable: number;
};

function ensureEventSummary(
  byEventType: Record<string, EventSummary>,
  eventType: string,
) {
  if (!byEventType[eventType]) {
    byEventType[eventType] = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      terminalFailures: 0,
      skippedNonRetryable: 0,
    };
  }
  return byEventType[eventType];
}

export async function processOutboxBatch(input?: {
  batchSize?: number;
  maxAttempts?: number;
}) {
  const maxAttempts = input?.maxAttempts ?? MAX_ATTEMPTS;
  const batchSize = input?.batchSize ?? BATCH_SIZE;

  const messages = await prisma.outboxMessage.findMany({
    where: {
      processed: false,
      attempts: { lt: maxAttempts },
    },
    orderBy: { created_at: "asc" },
    take: batchSize,
  });

  const results: { id: string; success: boolean; error?: string }[] = [];
  const byEventType: Record<string, EventSummary> = {};

  for (const message of messages) {
    const eventSummary = ensureEventSummary(byEventType, message.event_type);
    eventSummary.processed += 1;

    try {
      if (!isOutboxEventType(message.event_type)) {
        throw new Error(
          `[Outbox] Unsupported event type "${message.event_type}"`,
        );
      }

      const payload = parseOutboxPayload(message.event_type, message.payload);
      await deliverOutboxEvent({
        eventType: message.event_type,
        payload,
        businessId: message.business_id,
      });

      await prisma.outboxMessage.update({
        where: { id: message.id },
        data: {
          processed: true,
          processed_at: getCurrentDateTimePH(),
        },
      });

      eventSummary.succeeded += 1;
      results.push({ id: message.id, success: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const nonRetryable = isNonRetryableOutboxError(error);
      const nextAttempts = message.attempts + 1;
      const reachedTerminalAttempts = nonRetryable || nextAttempts >= maxAttempts;

      if (nonRetryable) {
        await prisma.outboxMessage.update({
          where: { id: message.id },
          data: {
            processed: true,
            processed_at: getCurrentDateTimePH(),
            attempts: { increment: 1 },
            last_error: `[SKIPPED_NON_RETRYABLE] ${errorMessage}`,
          },
        });
      } else {
        await prisma.outboxMessage.update({
          where: { id: message.id },
          data: {
            attempts: { increment: 1 },
            last_error: errorMessage,
          },
        });
      }

      eventSummary.failed += 1;
      if (reachedTerminalAttempts) {
        eventSummary.terminalFailures += 1;
        if (nonRetryable) {
          eventSummary.skippedNonRetryable += 1;
        }
        logger.error("[Outbox] Event reached terminal failure state", {
          outboxMessageId: message.id,
          eventType: message.event_type,
          attempts: nextAttempts,
          maxAttempts,
          businessId: message.business_id,
          nonRetryable,
          errorMessage,
        });
      } else {
        logger.warn("[Outbox] Event processing failed and will be retried", {
          outboxMessageId: message.id,
          eventType: message.event_type,
          attempts: nextAttempts,
          maxAttempts,
          businessId: message.business_id,
          errorMessage,
        });
      }

      results.push({ id: message.id, success: false, error: errorMessage });
    }
  }

  const succeeded = results.filter((result) => result.success).length;
  const failed = results.filter((result) => !result.success).length;
  const terminalFailures = Object.values(byEventType).reduce(
    (sum, item) => sum + item.terminalFailures,
    0,
  );
  const skippedNonRetryable = Object.values(byEventType).reduce(
    (sum, item) => sum + item.skippedNonRetryable,
    0,
  );

  logger.info("[Outbox] Processed batch", {
    processed: messages.length,
    succeeded,
    failed,
    terminalFailures,
    skippedNonRetryable,
    byEventType,
  });

  return {
    success: true as const,
    processed: messages.length,
    succeeded,
    failed,
    terminalFailures,
    skippedNonRetryable,
    byEventType,
    processedAt: getCurrentDateTimePH().toISOString(),
  };
}

/**
 * Processes pending outbox messages.
 * Configure this to run every 1-2 minutes via cron-job.org or similar.
 */
export async function GET(request: Request) {
  await connection();
  try {
    if (!isCronAuthorized(request)) {
      console.error("Invalid cron credentials");
      return unauthorizedCronResponse();
    }

    const result = await processOutboxBatch({
      batchSize: BATCH_SIZE,
      maxAttempts: MAX_ATTEMPTS,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Process outbox cron error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
