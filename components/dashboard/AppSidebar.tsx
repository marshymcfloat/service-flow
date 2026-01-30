import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/next auth/options";
import { SidebarSkeleton } from "./SidebarSkeleton";
import { AppSidebarClient } from "./AppSidebarClient";

export async function AppSidebar() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return <SidebarSkeleton />;
  }

  const { businessSlug, name, email, role } = session.user;
  const slug = businessSlug || "demo";

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
