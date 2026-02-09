import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next auth/options";
import { redirect } from "next/navigation";
import { prisma } from "@/prisma/prisma";
import { OwnersPageClient } from "./OwnersPageClient";

interface OwnersContentProps {
  businessSlug: string;
}

export async function OwnersContent({ businessSlug }: OwnersContentProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true },
  });

  if (!business) {
    redirect("/auth/login");
  }

  const owners = await prisma.owner.findMany({
    where: {
      business_id: business.id,
    },
    include: {
      user: true,
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  // Fetch service categories for specialty selection
  const serviceCategories = await prisma.service.findMany({
    where: {
      business_id: business.id,
    },
    select: {
      category: true,
    },
    distinct: ["category"],
  });

  const categories = serviceCategories
    .map((item) => item.category)
    .filter((category) => category.toLowerCase() !== "general")
    .sort((a, b) => a.localeCompare(b));

  return (
    <OwnersPageClient
      owners={owners}
      businessSlug={businessSlug}
      categories={categories}
    />
  );
}
