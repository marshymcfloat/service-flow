import { connection } from "next/server";
import { redirect } from "next/navigation";

import {
  retryOutboxMessageAction,
  skipOutboxMessageAction,
} from "@/lib/server actions/platform-admin";
import { prisma } from "@/prisma/prisma";
import {
  buildPlatformErrorPath,
  type PlatformSearchParams,
  buildPlatformSuccessPath,
  getPlatformFlashMessage,
  PlatformFlashNotice,
  rethrowIfRedirectError,
  toActionErrorMessage,
} from "../_components/action-feedback";
import {
  PlatformMetricCard,
  PlatformPageHeader,
  PlatformStatusBadge,
  formatPlatformDateTime,
  platformDangerButtonClass,
  platformPanelClass,
  platformSecondaryButtonClass,
  platformTableCellClass,
  platformTableClass,
  platformTableContainerClass,
  platformTableHeadClass,
} from "../_components/platform-ui";

type PlatformOutboxPageProps = {
  searchParams?: PlatformSearchParams;
};

const OUTBOX_MAX_ATTEMPTS = 3;

function getQueueStatus(message: {
  processed: boolean;
  attempts: number;
  last_error: string | null;
}) {
  const error = message.last_error ?? "";
  if (message.processed && error.startsWith("[SKIPPED")) return "SKIPPED";
  if (message.processed) return "PROCESSED";
  if (message.attempts >= OUTBOX_MAX_ATTEMPTS) return "TERMINAL";
  if (message.attempts > 0) return "RETRYING";
  return "PENDING";
}

function formatErrorPreview(value: string | null) {
  if (!value) return "-";
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= 120) return compact;
  return `${compact.slice(0, 120)}...`;
}

export default async function PlatformOutboxPage({
  searchParams,
}: PlatformOutboxPageProps) {
  await connection();
  const flash = await getPlatformFlashMessage(searchParams);

  const messages = await prisma.outboxMessage.findMany({
    select: {
      id: true,
      event_type: true,
      aggregate_type: true,
      aggregate_id: true,
      business_id: true,
      processed: true,
      processed_at: true,
      attempts: true,
      last_error: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
    take: 250,
  });
  const businessIds = Array.from(new Set(messages.map((message) => message.business_id)));
  const businesses = businessIds.length
    ? await prisma.business.findMany({
        where: { id: { in: businessIds } },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      })
    : [];
  const businessById = new Map(
    businesses.map((business) => [business.id, business]),
  );

  async function retryMessageFormAction(messageId: string) {
    "use server";
    try {
      const result = await retryOutboxMessageAction(messageId);
      if (!result.success) {
        redirect(buildPlatformErrorPath("/platform/outbox", result.error));
      }

      redirect(buildPlatformSuccessPath("/platform/outbox", "Outbox message queued for retry."));
    } catch (error) {
      rethrowIfRedirectError(error);
      redirect(
        buildPlatformErrorPath(
          "/platform/outbox",
          toActionErrorMessage(error, "Unable to queue retry."),
        ),
      );
    }
  }

  async function skipMessageFormAction(messageId: string) {
    "use server";
    try {
      const result = await skipOutboxMessageAction({
        messageId,
        reason: "Skipped from platform outbox queue.",
      });
      if (!result.success) {
        redirect(buildPlatformErrorPath("/platform/outbox", result.error));
      }

      redirect(buildPlatformSuccessPath("/platform/outbox", "Outbox message marked as skipped."));
    } catch (error) {
      rethrowIfRedirectError(error);
      redirect(
        buildPlatformErrorPath(
          "/platform/outbox",
          toActionErrorMessage(error, "Unable to skip message."),
        ),
      );
    }
  }

  const pendingCount = messages.filter(
    (message) => !message.processed && message.attempts === 0,
  ).length;
  const retryingCount = messages.filter(
    (message) =>
      !message.processed &&
      message.attempts > 0 &&
      message.attempts < OUTBOX_MAX_ATTEMPTS,
  ).length;
  const terminalCount = messages.filter(
    (message) => !message.processed && message.attempts >= OUTBOX_MAX_ATTEMPTS,
  ).length;
  const skippedCount = messages.filter(
    (message) => message.processed && (message.last_error ?? "").startsWith("[SKIPPED"),
  ).length;
  const processedCount = messages.filter(
    (message) => message.processed && !message.last_error,
  ).length;

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Outbox Operations"
        description="Review pending/failed events, retry safe recoveries, and skip unsendable records with explicit operator intent."
      />
      {flash ? <PlatformFlashNotice flash={flash} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <PlatformMetricCard label="Pending" value={pendingCount} />
        <PlatformMetricCard label="Retrying" value={retryingCount} />
        <PlatformMetricCard label="Terminal" value={terminalCount} />
        <PlatformMetricCard label="Skipped" value={skippedCount} />
        <PlatformMetricCard label="Processed" value={processedCount} tone="accent" />
      </div>

      <section className={`${platformPanelClass} p-5 sm:p-6`}>
        <div className={platformTableContainerClass}>
          <table className={platformTableClass}>
            <thead>
              <tr className="border-b border-[var(--pf-border)]">
                <th className={platformTableHeadClass}>Event</th>
                <th className={platformTableHeadClass}>Business</th>
                <th className={platformTableHeadClass}>Queue Status</th>
                <th className={platformTableHeadClass}>Attempts</th>
                <th className={platformTableHeadClass}>Last Error</th>
                <th className={platformTableHeadClass}>Created</th>
                <th className={platformTableHeadClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => {
                const queueStatus = getQueueStatus(message);
                const canRetry = !message.processed || Boolean(message.last_error);
                const canSkip = !message.processed;
                const business = businessById.get(message.business_id);

                return (
                  <tr key={message.id} className="border-b border-[var(--pf-border)]/80 last:border-0">
                    <td className={`${platformTableCellClass} min-w-[190px] whitespace-normal`}>
                      <p className="font-semibold">{message.event_type}</p>
                      <p className="text-xs text-[var(--pf-muted)]">
                        {message.aggregate_type} #{message.aggregate_id}
                      </p>
                    </td>
                    <td className={`${platformTableCellClass} min-w-[180px] whitespace-normal`}>
                      <p>{business?.name ?? "Unknown business"}</p>
                      <p className="text-xs text-[var(--pf-muted)]">
                        {business?.slug ?? message.business_id}
                      </p>
                    </td>
                    <td className={platformTableCellClass}>
                      <PlatformStatusBadge status={queueStatus} />
                    </td>
                    <td className={platformTableCellClass}>{message.attempts}</td>
                    <td className={`${platformTableCellClass} min-w-[260px] whitespace-normal`}>
                      <p className="break-words text-xs text-[var(--pf-muted)]">
                        {formatErrorPreview(message.last_error)}
                      </p>
                    </td>
                    <td className={`${platformTableCellClass} min-w-[150px] whitespace-normal`}>
                      <p>{formatPlatformDateTime(message.created_at)}</p>
                      {message.processed_at ? (
                        <p className="text-xs text-[var(--pf-muted)]">
                          Processed: {formatPlatformDateTime(message.processed_at)}
                        </p>
                      ) : null}
                    </td>
                    <td className={`${platformTableCellClass} min-w-[220px]`}>
                      <div className="flex flex-wrap gap-2">
                        {canRetry ? (
                          <form action={retryMessageFormAction.bind(null, message.id)}>
                            <button type="submit" className={platformSecondaryButtonClass}>
                              Retry
                            </button>
                          </form>
                        ) : null}
                        {canSkip ? (
                          <form action={skipMessageFormAction.bind(null, message.id)}>
                            <button type="submit" className={platformDangerButtonClass}>
                              Skip
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
