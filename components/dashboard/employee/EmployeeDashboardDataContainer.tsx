import React from "react";
import EmployeeDashboard from "./EmployeeDashboard";
import { prisma } from "@/prisma/prisma";

export default async function EmployeeDashboardDataContainer({
  businessSlug,
}: {
  businessSlug: string;
}) {
  const businessName = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: { name: true },
  });

  console.log(businessSlug);
  return (
    <EmployeeDashboard
      businessName={businessName?.name || null}
      businessSlug={businessSlug}
    />
  );
}
