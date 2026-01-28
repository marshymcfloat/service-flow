import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import React from "react";

export default function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <div className="bg-background">
      <SidebarProvider>
        <AppSidebar />
        <SidebarTrigger />
        {children}
        {modal}
      </SidebarProvider>
    </div>
  );
}
