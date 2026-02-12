import { prisma } from "@/prisma/prisma";
import { connection } from "next/server";
import {
  PlatformMetricCard,
  PlatformPageHeader,
  formatPlatformDateTime,
  platformPanelClass,
  platformTableCellClass,
  platformTableClass,
  platformTableContainerClass,
  platformTableHeadClass,
} from "../_components/platform-ui";

export default async function PlatformAuditPage() {
  await connection();

  const logs = await prisma.platformActionLog.findMany({
    include: {
      business: { select: { name: true } },
      actor_user: { select: { email: true, name: true } },
    },
    orderBy: { created_at: "desc" },
    take: 300,
  });

  const uniqueActionTypes = new Set(logs.map((log) => log.action)).size;
  const systemActions = logs.filter((log) => !log.actor_user && !log.actor_email).length;
  const userActions = logs.length - systemActions;

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Platform Audit Trail"
        description="Review operational events across billing, referrals, and subscription control with full actor visibility."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformMetricCard label="Total Logs" value={logs.length} />
        <PlatformMetricCard label="Action Types" value={uniqueActionTypes} tone="accent" />
        <PlatformMetricCard label="User Actions" value={userActions} />
        <PlatformMetricCard label="System Actions" value={systemActions} />
      </div>

      <section className={`${platformPanelClass} p-5 sm:p-6`}>
        <div className={platformTableContainerClass}>
          <table className={platformTableClass}>
            <thead>
              <tr className="border-b border-[var(--pf-border)]">
                <th className={platformTableHeadClass}>Time</th>
                <th className={platformTableHeadClass}>Action</th>
                <th className={platformTableHeadClass}>Target</th>
                <th className={platformTableHeadClass}>Business</th>
                <th className={platformTableHeadClass}>Actor</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[var(--pf-border)]/80 last:border-0">
                  <td className={`${platformTableCellClass} min-w-[160px]`}>
                    {formatPlatformDateTime(log.created_at)}
                  </td>
                  <td className={`${platformTableCellClass} min-w-[190px] whitespace-normal`}>
                    <p className="font-medium text-[var(--pf-text)]">{log.action}</p>
                  </td>
                  <td className={`${platformTableCellClass} min-w-[210px] whitespace-normal`}>
                    <p>{log.target_type}</p>
                    <p className="text-xs text-[var(--pf-muted)]">{log.target_id}</p>
                  </td>
                  <td className={`${platformTableCellClass} min-w-[160px] whitespace-normal`}>
                    {log.business?.name ?? "-"}
                  </td>
                  <td className={`${platformTableCellClass} min-w-[200px] whitespace-normal`}>
                    {log.actor_user?.name ?? log.actor_user?.email ?? log.actor_email ?? "SYSTEM"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
