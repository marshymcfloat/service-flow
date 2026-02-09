import { getServerSession } from "next-auth";
import { prisma } from "@/prisma/prisma";

import { authOptions } from "@/lib/next auth/options";
import { SidebarSkeleton } from "./SidebarSkeleton";
import { AppSidebarClient } from "./AppSidebarClient";

export async function AppSidebar() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return <SidebarSkeleton />;
  }

  const { name, email, role } = session.user;
  let slug = session.user.businessSlug;

  // Fallback: If slug is missing in session (e.g. old session), try to fetch it
  if (!slug) {
    const userWithBusiness = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        employee: { include: { business: true } },
        owner: { include: { business: true } },
      },
    });

    slug =
      userWithBusiness?.employee?.business.slug ??
      userWithBusiness?.owner?.business.slug;
  }

  // Final fallback
  if (!slug) {
    slug = "demo";
  }

  return (
    <AppSidebarClient
      businessSlug={slug}
      user={{
        name: name || "User",
        email: email || "",
        role: role || "EMPLOYEE",
      }}
    />
  );
}
