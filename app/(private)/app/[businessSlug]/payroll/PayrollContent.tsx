import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next auth/options";
import { redirect } from "next/navigation";
import { prisma } from "@/prisma/prisma";
import { getCachedBusinessBySlug } from "@/lib/data/cached";
import { PayrollPageClient } from "./PayrollPageClient";

interface PayrollContentProps {
  businessSlug: string;
}

export async function PayrollContent({ businessSlug }: PayrollContentProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  const business = await getCachedBusinessBySlug(businessSlug);

  if (!business) {
    redirect("/");
  }

  const employees = await prisma.employee.findMany({
    where: { business_id: business.id },
    include: {
      user: true,
      payslips: {
        orderBy: { ending_date: "desc" },
        take: 1,
      },
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  return <PayrollPageClient employees={employees} />;
}
