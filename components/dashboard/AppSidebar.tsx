import { Calendar, Home, Inbox, Search, Settings } from "lucide-react";
import { getServerSession } from "next-auth";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authOptions } from "@/lib/next auth/options";
import { SidebarUserFooter } from "./SidebarUserFooter";
import { SidebarSkeleton } from "./SidebarSkeleton";
import { Suspense } from "react";

export async function AppSidebar() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return <SidebarSkeleton />;
  }

  const { businessSlug } = session.user;
  const slug = businessSlug || "demo";

  const items = [
    {
      title: "Dashboard",
      url: `/app/${slug}`,
      icon: Home,
    },
    {
      title: "Manage Business",
      url: `/app/${slug}/business`,
      icon: Settings,
    },
  ];

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarUserFooter user={session.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
