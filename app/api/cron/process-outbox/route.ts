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
import type { OutboxMessage } from "@/prisma/generated/prisma/client";

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 10;
const CLAIM_LOOKAHEAD_MULTIPLIER = 3;
const DELIVERY_CONCURRENCY = 4;

type EventSummary = {
  processed: number;
  succeeded: number;
  failed: number;
  terminalFailures: number;
  skippedNonRetryable: number;
};

type MessageResult = {
  id: string;
  eventType: string;
  success: boolean;
  nonRetryable: boolean;
  reachedTerminalAttempts: boolean;
  error?: string;
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

async function claimPendingOutboxMessages(input: {
  batchSize: number;
  maxAttempts: number;
}) {
  const candidates = await prisma.outboxMessage.findMany({
    where: {
      processed: false,
      attempts: { lt: input.maxAttempts },
    },
    orderBy: { created_at: "asc" },
    take: input.batchSize * CLAIM_LOOKAHEAD_MULTIPLIER,
  });

  const claimed: OutboxMessage[] = [];

  for (const candidate of candidates) {
    if (claimed.length >= input.batchSize) {
      break;
    }

    const claim = await prisma.outboxMessage.updateMany({
      where: {
        id: candidate.id,
        processed: false,
        attempts: candidate.attempts,
      },
      data: {
        attempts: { increment: 1 },
      },
    });

    if (claim.count === 1) {
      claimed.push({
        ...candidate,
        attempts: candidate.attempts + 1,
      });
    }
  }

  return claimed;
}

async function processClaimedMessage(
  message: OutboxMessage,
  maxAttempts: number,
): Promise<MessageResult> {
  try {
    if (!isOutboxEventType(message.event_type)) {
      throw new Error(`[Outbox] Unsupported event type "${message.event_type}"`);
    }

    const payload = parseOutboxPayload(message.event_type, message.payload);
    await deliverOutboxEvent({
      eventType: message.event_type,
      payload,
      businessId: message.business_id,
      outboxMessageId: message.id,
    });

    await prisma.outboxMessage.update({
      where: { id: message.id },
      data: {
        processed: true,
        processed_at: getCurrentDateTimePH(),
        last_error: null,
      },
    });

    return {
      id: message.id,
      eventType: message.event_type,
      success: true,
      nonRetryable: false,
      reachedTerminalAttempts: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const nonRetryable = isNonRetryableOutboxError(error);
    const reachedTerminalAttempts = nonRetryable || message.attempts >= maxAttempts;

    if (nonRetryable) {
      await prisma.outboxMessage.update({
        where: { id: message.id },
        data: {
          processed: true,
          processed_at: getCurrentDateTimePH(),
          last_error: `[SKIPPED_NON_RETRYABLE] ${errorMessage}`,
        },
      });
    } else {
      await prisma.outboxMessage.update({
        where: { id: message.id },
        data: {
          last_error: errorMessage,
        },
      });
    }

    if (reachedTerminalAttempts) {
      logger.error("[Outbox] Event reached terminal failure state", {
        outboxMessageId: message.id,
        eventType: message.event_type,
        attempts: message.attempts,
        maxAttempts,
        businessId: message.business_id,
        nonRetryable,
        errorMessage,
      });
    } else {
      logger.warn("[Outbox] Event processing failed and will be retried", {
        outboxMessageId: message.id,
        eventType: message.event_type,
        attempts: message.attempts,
        maxAttempts,
        businessId: message.business_id,
        errorMessage,
      });
    }

    return {
      id: message.id,
      eventType: message.event_type,
      success: false,
      nonRetryable,
      reachedTerminalAttempts,
      error: errorMessage,
    };
  }
}

export async function processOutboxBatch(input?: {
  batchSize?: number;
  maxAttempts?: number;
}) {
  const maxAttempts = input?.maxAttempts ?? MAX_ATTEMPTS;
  const batchSize = input?.batchSize ?? BATCH_SIZE;

  const messages = await claimPendingOutboxMessages({
    batchSize,
    maxAttempts,
  });

  const results: MessageResult[] = [];
  const byEventType: Record<string, EventSummary> = {};

  for (let i = 0; i < messages.length; i += DELIVERY_CONCURRENCY) {
    const chunk = messages.slice(i, i + DELIVERY_CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map((message) => processClaimedMessage(message, maxAttempts)),
    );
    results.push(...chunkResults);
  }

  for (const result of results) {
    const eventSummary = ensureEventSummary(byEventType, result.eventType);
    eventSummary.processed += 1;

    if (result.success) {
      eventSummary.succeeded += 1;
    } else {
      eventSummary.failed += 1;
      if (result.reachedTerminalAttempts) {
        eventSummary.terminalFailures += 1;
      }
      if (result.nonRetryable) {
        eventSummary.skippedNonRetryable += 1;
      }
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
