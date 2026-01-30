import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarSkeleton } from "@/components/dashboard/SidebarSkeleton";
import React from "react";
import { Metadata } from "next";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next auth/options";

import { connection } from "next/server";

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

async function AppLayoutContent({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  await connection();
  const session = await getServerSession(authOptions);
  const isEmployee = session?.user?.role === "EMPLOYEE";

  if (isEmployee) {
    return (
      <div className="bg-background min-h-screen">
        {children}
        {modal}
      </div>
    );
  }

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

export default function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <React.Suspense fallback={<SidebarSkeleton />}>
      <AppLayoutContent children={children} modal={modal} />
    </React.Suspense>
  );
}
