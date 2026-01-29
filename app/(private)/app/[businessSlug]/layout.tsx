import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarSkeleton } from "@/components/dashboard/SidebarSkeleton";
import React from "react";
import { Metadata } from "next";
import { prisma } from "@/prisma/prisma";

type Props = {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: Promise<{ businessSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { businessSlug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: { name: true },
  });

  return {
    title: business?.name || "Dashboard",
  };
}

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
        <React.Suspense fallback={<SidebarSkeleton />}>
          <AppSidebar />
        </React.Suspense>
        <SidebarTrigger />
        {children}
        {modal}
      </SidebarProvider>
    </div>
  );
}
