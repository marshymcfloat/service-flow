import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/next auth/options";
import { getGiftCardsAction } from "@/lib/server actions/gift-cards";
import { prisma } from "@/prisma/prisma";
import { GiftCardsPageClient } from "./GiftCardsPageClient";

interface GiftCardsContentProps {
  businessSlug: string;
}

export async function GiftCardsContent({ businessSlug }: GiftCardsContentProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login");
  }

  if (
    session.user.businessSlug &&
    session.user.businessSlug !== businessSlug
  ) {
    redirect(`/app/${session.user.businessSlug}/gift-cards`);
  }

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: {
      id: true,
      initials: true,
    },
  });

  if (!business) {
    redirect("/");
  }

  const [giftCardsResult, services, packages] = await Promise.all([
    getGiftCardsAction(businessSlug),
    prisma.service.findMany({
      where: {
        business_id: business.id,
      },
      select: {
        id: true,
        name: true,
        category: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.servicePackage.findMany({
      where: {
        business_id: business.id,
      },
      select: {
        id: true,
        name: true,
        category: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  return (
    <GiftCardsPageClient
      giftCards={giftCardsResult.success && giftCardsResult.data ? giftCardsResult.data : []}
      services={services}
      packages={packages}
      initials={business.initials || "GC"}
      businessSlug={businessSlug}
    />
  );
}
