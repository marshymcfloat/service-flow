import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next auth/options";
import { redirect } from "next/navigation";
import { prisma } from "@/prisma/prisma";
import { ServicesPageClient } from "./ServicesPageClient";

interface ServicesContentProps {
  businessSlug: string;
}

export async function ServicesContent({ businessSlug }: ServicesContentProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  // Fetch services for this business
  const services = await prisma.service.findMany({
    where: {
      business: {
        slug: businessSlug,
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  // Get unique categories
  const categories = [
    ...new Set(services.map((s: { category: string }) => s.category)),
  ];

  return (
    <ServicesPageClient
      services={services}
      categories={categories}
      businessSlug={businessSlug}
    />
  );
}
