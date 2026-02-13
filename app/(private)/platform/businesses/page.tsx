import {
  applyCreditAdjustmentAction,
  createBusinessWithSubscriptionAction,
  grantTrialMonthsAction,
  reactivateBusinessAction,
  suspendBusinessAction,
} from "@/lib/server actions/platform-admin";
import { redirect } from "next/navigation";
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
  formatPlatformDate,
  platformDangerButtonClass,
  platformInputClass,
  platformPanelClass,
  platformPrimaryButtonClass,
  platformSecondaryButtonClass,
  platformTableCellClass,
  platformTableClass,
  platformTableContainerClass,
  platformTableHeadClass,
  platformTableWrapCellClass,
} from "../_components/platform-ui";

type PlatformBusinessesPageProps = {
  searchParams?: PlatformSearchParams;
};

export default async function PlatformBusinessesPage({
  searchParams,
}: PlatformBusinessesPageProps) {
  const flash = await getPlatformFlashMessage(searchParams);
  const businesses = await prisma.business.findMany({
    include: {
      subscriptions: {
        include: {
          plan: true,
        },
      },
      owners: {
        include: {
          user: {
            select: { email: true, name: true },
          },
        },
        take: 1,
      },
    },
    orderBy: { created_at: "desc" },
    take: 200,
  });

  async function createBusinessFormAction(formData: FormData) {
    "use server";
    try {
      const businessName = String(formData.get("businessName") || "");
      const businessSlug = String(formData.get("businessSlug") || "");
      const initials = String(formData.get("initials") || "");
      const ownerName = String(formData.get("ownerName") || "");
      const ownerEmail = String(formData.get("ownerEmail") || "");
      const ownerPassword = String(formData.get("ownerPassword") || "");
      const referralCode = String(formData.get("referralCode") || "");

      const result = await createBusinessWithSubscriptionAction({
        businessName,
        businessSlug,
        initials,
        ownerName,
        ownerEmail,
        ownerPassword: ownerPassword || undefined,
        referralCode: referralCode || undefined,
        planCode: "PRO_MONTHLY",
        trialMonths: 1,
      });

      if (!result.success) {
        redirect(buildPlatformErrorPath("/platform/businesses", result.error));
      }

      redirect(buildPlatformSuccessPath("/platform/businesses", "Business created successfully."));
    } catch (error) {
      rethrowIfRedirectError(error);
      redirect(
        buildPlatformErrorPath(
          "/platform/businesses",
          toActionErrorMessage(error, "Unable to create business."),
        ),
      );
    }
  }

  async function grantTrialFormAction(businessId: string) {
    "use server";
    try {
      const result = await grantTrialMonthsAction(businessId, 1);
      if (!result.success) {
        redirect(buildPlatformErrorPath("/platform/businesses", result.error));
      }

      redirect(buildPlatformSuccessPath("/platform/businesses", "Trial month granted."));
    } catch (error) {
      rethrowIfRedirectError(error);
      redirect(
        buildPlatformErrorPath(
          "/platform/businesses",
          toActionErrorMessage(error, "Unable to grant trial month."),
        ),
      );
    }
  }

  async function addCreditFormAction(businessId: string) {
    "use server";
    try {
      const result = await applyCreditAdjustmentAction(
        businessId,
        { months: 1 },
        "Manual admin credit",
      );
      if (!result.success) {
        redirect(buildPlatformErrorPath("/platform/businesses", result.error));
      }

      redirect(buildPlatformSuccessPath("/platform/businesses", "Credit adjustment applied."));
    } catch (error) {
      rethrowIfRedirectError(error);
      redirect(
        buildPlatformErrorPath(
          "/platform/businesses",
          toActionErrorMessage(error, "Unable to apply credit adjustment."),
        ),
      );
    }
  }

  async function suspendBusinessFormAction(businessId: string) {
    "use server";
    try {
      const result = await suspendBusinessAction(businessId, "Admin suspension");
      if (!result.success) {
        redirect(buildPlatformErrorPath("/platform/businesses", result.error));
      }

      redirect(buildPlatformSuccessPath("/platform/businesses", "Business suspended."));
    } catch (error) {
      rethrowIfRedirectError(error);
      redirect(
        buildPlatformErrorPath(
          "/platform/businesses",
          toActionErrorMessage(error, "Unable to suspend business."),
        ),
      );
    }
  }

  async function reactivateBusinessFormAction(businessId: string) {
    "use server";
    try {
      const result = await reactivateBusinessAction(businessId);
      if (!result.success) {
        redirect(buildPlatformErrorPath("/platform/businesses", result.error));
      }

      redirect(buildPlatformSuccessPath("/platform/businesses", "Business reactivated."));
    } catch (error) {
      rethrowIfRedirectError(error);
      redirect(
        buildPlatformErrorPath(
          "/platform/businesses",
          toActionErrorMessage(error, "Unable to reactivate business."),
        ),
      );
    }
  }

  const activeBusinesses = businesses.filter((business) => business.subscriptions[0]?.status === "ACTIVE").length;
  const trialingBusinesses = businesses.filter((business) => business.subscriptions[0]?.status === "TRIALING").length;
  const atRiskBusinesses = businesses.filter((business) =>
    ["GRACE_PERIOD", "SUSPENDED"].includes(business.subscriptions[0]?.status ?? ""),
  ).length;

  return (
    <div className="space-y-6">
      <PlatformPageHeader
        title="Business Operations"
        description="Create businesses quickly, monitor subscription health, and resolve payment-risk accounts before churn."
      />
      {flash ? <PlatformFlashNotice flash={flash} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformMetricCard label="Total Businesses" value={businesses.length} />
        <PlatformMetricCard label="Active Accounts" value={activeBusinesses} tone="accent" />
        <PlatformMetricCard label="Trialing Accounts" value={trialingBusinesses} />
        <PlatformMetricCard label="At-Risk Accounts" value={atRiskBusinesses} />
      </div>

      <section className={`${platformPanelClass} p-5 sm:p-6`}>
        <h3 className="text-lg font-semibold tracking-tight text-[var(--pf-text)]">
          Create Business (Admin Onboarding)
        </h3>
        <p className="mt-1 text-sm text-[var(--pf-muted)]">
          Use this form for assisted onboarding when a business needs manual setup.
        </p>
        <form action={createBusinessFormAction} className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[var(--pf-text)]">Business Name</span>
            <input name="businessName" className={platformInputClass} required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[var(--pf-text)]">Business Slug</span>
            <input name="businessSlug" className={platformInputClass} placeholder="business-slug" required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[var(--pf-text)]">Initials</span>
            <input name="initials" className={platformInputClass} placeholder="BF" maxLength={2} required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[var(--pf-text)]">Owner Name</span>
            <input name="ownerName" className={platformInputClass} required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[var(--pf-text)]">Owner Email</span>
            <input name="ownerEmail" type="email" className={platformInputClass} required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[var(--pf-text)]">Temporary Password</span>
            <input name="ownerPassword" className={platformInputClass} placeholder="Optional" />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-[var(--pf-text)]">Referral Code</span>
            <input name="referralCode" className={platformInputClass} placeholder="Optional" />
          </label>
          <div className="flex items-end">
            <button type="submit" className={`${platformPrimaryButtonClass} w-full`}>
              Create Business
            </button>
          </div>
        </form>
      </section>

      <section className={`${platformPanelClass} p-5 sm:p-6`}>
        <h3 className="text-lg font-semibold tracking-tight text-[var(--pf-text)]">Business Subscriptions</h3>
        <p className="mt-1 text-sm text-[var(--pf-muted)]">
          Trial, credit, suspend, and reactivate subscriptions without leaving this screen.
        </p>
        <div className={`mt-4 ${platformTableContainerClass}`}>
          <table className={platformTableClass}>
            <thead>
              <tr className="border-b border-[var(--pf-border)]">
                <th className={platformTableHeadClass}>Business</th>
                <th className={platformTableHeadClass}>Owner</th>
                <th className={platformTableHeadClass}>Plan</th>
                <th className={platformTableHeadClass}>Status</th>
                <th className={platformTableHeadClass}>Period End</th>
                <th className={platformTableHeadClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((business) => {
                const subscription = business.subscriptions[0];
                return (
                  <tr key={business.id} className="border-b border-[var(--pf-border)]/80 last:border-0">
                    <td className={`${platformTableCellClass} min-w-[200px] max-w-[280px] ${platformTableWrapCellClass}`}>
                      <p className="font-semibold text-[var(--pf-text)]">{business.name}</p>
                      <p className="text-xs text-[var(--pf-muted)]">{business.slug}</p>
                      <p className="mt-1 text-xs text-[var(--pf-muted)]">
                        Created {formatPlatformDate(business.created_at)}
                      </p>
                    </td>
                    <td className={`${platformTableCellClass} min-w-[200px] max-w-[260px] ${platformTableWrapCellClass}`}>
                      <p>{business.owners[0]?.user.name ?? "-"}</p>
                      <p className="text-xs text-[var(--pf-muted)]">{business.owners[0]?.user.email ?? "-"}</p>
                    </td>
                    <td className={platformTableCellClass}>{subscription?.plan.code ?? "-"}</td>
                    <td className={platformTableCellClass}>
                      <PlatformStatusBadge status={subscription?.status ?? "MISSING"} />
                    </td>
                    <td className={platformTableCellClass}>
                      {subscription?.current_period_end ? formatPlatformDate(subscription.current_period_end) : "-"}
                    </td>
                    <td className={`${platformTableCellClass} min-w-[280px]`}>
                      <div className="flex flex-wrap gap-2">
                        <form action={grantTrialFormAction.bind(null, business.id)}>
                          <button type="submit" className={platformSecondaryButtonClass}>
                            +1 Trial
                          </button>
                        </form>
                        <form action={addCreditFormAction.bind(null, business.id)}>
                          <button type="submit" className={platformSecondaryButtonClass}>
                            +1 Credit
                          </button>
                        </form>
                        <form action={suspendBusinessFormAction.bind(null, business.id)}>
                          <button type="submit" className={platformDangerButtonClass}>
                            Suspend
                          </button>
                        </form>
                        <form action={reactivateBusinessFormAction.bind(null, business.id)}>
                          <button
                            type="submit"
                            className={`${platformSecondaryButtonClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
                          >
                            Reactivate
                          </button>
                        </form>
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
