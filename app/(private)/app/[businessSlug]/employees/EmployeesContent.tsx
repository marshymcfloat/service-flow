import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next auth/options";
import { redirect } from "next/navigation";
import { prisma } from "@/prisma/prisma";
import { EmployeesPageClient } from "./EmployeesPageClient";

interface EmployeesContentProps {
  businessSlug: string;
}

export async function EmployeesContent({
  businessSlug,
}: EmployeesContentProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  const employees = await prisma.employee.findMany({
    where: {
      business: {
        slug: businessSlug,
      },
    },
    include: {
      user: true,
      attendance: {
        orderBy: { date: "desc" },
        take: 7,
      },
      payslips: {
        orderBy: { ending_date: "desc" },
        take: 1,
      },
      _count: {
        select: {
          served_services: true,
        },
      },
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  return (
    <EmployeesPageClient employees={employees} businessSlug={businessSlug} />
  );
}
