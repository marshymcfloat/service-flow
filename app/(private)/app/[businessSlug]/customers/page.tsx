import { prisma } from "@/prisma/prisma";
import { notFound } from "next/navigation";
import { CustomersClient } from "@/components/dashboard/customers/CustomersClient";

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { businessSlug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
  });

  if (!business) {
    notFound();
  }

  // Fetch customers
  // In a real app we might want pagination here, but for now fetch all (or limit to recently active)
  const customers = await prisma.customer.findMany({
    where: {
      business_id: business.id,
    },
    orderBy: {
      name: "asc",
    },
  });

  return <CustomersClient customers={customers} businessSlug={businessSlug} />;
}
