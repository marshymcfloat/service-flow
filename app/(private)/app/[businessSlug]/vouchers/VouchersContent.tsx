import { prisma } from "@/prisma/prisma";
import { getVouchersAction } from "@/lib/server actions/vouchers";
import { VoucherManagementClient } from "@/components/dashboard/owner/vouchers/VoucherManagementClient";

interface VouchersContentProps {
  businessSlug: string;
}

export async function VouchersContent({ businessSlug }: VouchersContentProps) {
  // Parallel data fetching
  const [vouchersResult, business] = await Promise.all([
    getVouchersAction(businessSlug),
    prisma.business.findUnique({
      where: { slug: businessSlug },
      select: { initials: true },
    }),
  ]);

  const { data: vouchers, success } = vouchersResult;

  return (
    <VoucherManagementClient
      vouchers={success && vouchers ? vouchers : []}
      businessSlug={businessSlug}
      initials={business?.initials || "VO"}
    />
  );
}
