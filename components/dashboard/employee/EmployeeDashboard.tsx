"use client";

import React from "react";
import { Plus, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import EmployeeServedHistory from "./EmployeeServedHistory";
import PendingServicesList from "./PendingServicesList";
import AttendanceCard from "./AttendanceCard";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function EmployeeDashboard({
  businessName,
  businessSlug,
  servedHistory,
  pendingServices,
  currentEmployeeId,
  currentEmployeeCommission,
  currentEmployeeSalary,
  todayAttendance,
}: {
  businessName: string | null;
  businessSlug: string;
  servedHistory: any[];
  pendingServices: any[];
  currentEmployeeId: number;
  currentEmployeeCommission: number;
  currentEmployeeSalary: number;
  todayAttendance: any;
}) {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <main className="min-h-screen bg-background pb-20 md:pb-8">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between md:px-8 md:py-4">
        <div>
          <h1 className="font-bold text-lg leading-tight md:text-xl text-foreground">
            {businessName}
          </h1>
          <p className="text-xs text-muted-foreground">Employee Dashboard</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="rounded-full shadow-sm h-8 w-8 p-0 md:w-auto md:h-9 md:px-4 transition-all"
          >
            <Link href={`/${businessSlug}/booking`}>
              <Plus className="h-4 w-4 md:mr-1.5" />
              <span className="hidden md:inline font-medium">Add Booking</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
              >
                <Avatar className="h-7 w-7 md:h-8 md:w-8">
                  <AvatarFallback className="bg-muted text-xs">
                    <UserIcon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="px-4 py-6 md:px-8 max-w-5xl mx-auto space-y-8">
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <AttendanceCard
            employeeId={currentEmployeeId}
            businessSlug={businessSlug}
            todayAttendance={todayAttendance}
            className="col-span-2 md:col-span-2"
          />

          <div className="bg-card border rounded-2xl p-4 flex flex-col justify-center shadow-sm col-span-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Estimated Salary
            </span>
            <span className="text-xl md:text-2xl font-bold mt-1">
              ₱{currentEmployeeSalary.toLocaleString()}
            </span>
          </div>

          <div className="bg-card border rounded-2xl p-4 flex flex-col justify-center shadow-sm col-span-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Served today
            </span>
            <span className="text-xl md:text-2xl font-bold mt-1 text-green-600">
              {
                servedHistory.filter((s) => {
                  const today = new Date();
                  const date = new Date(s.updated_at);
                  return (
                    date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear()
                  );
                }).length
              }
            </span>
          </div>

          <div className="bg-card border rounded-2xl p-4 flex flex-col justify-center shadow-sm col-span-2 md:col-span-1">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Queue
            </span>
            <span className="text-xl md:text-2xl font-bold mt-1 text-blue-600">
              {pendingServices.length}
            </span>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Queue / Pending
              </h2>
              <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                {pendingServices.length} waiting
              </span>
            </div>

            <div className="-mx-4 md:mx-0">
              <PendingServicesList
                services={pendingServices}
                businessSlug={businessSlug}
                currentEmployeeId={currentEmployeeId}
              />
            </div>
          </section>

          <section className="lg:col-span-5 space-y-4">
            <h2 className="text-base font-semibold text-foreground">
              Recent Activity
            </h2>
            <div className="-mx-4 md:mx-0">
              <EmployeeServedHistory
                services={servedHistory}
                currentEmployeeId={currentEmployeeId}
                currentEmployeeCommission={currentEmployeeCommission}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
