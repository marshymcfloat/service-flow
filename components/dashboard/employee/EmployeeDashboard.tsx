"use client";

import React from "react";
import DashboardCard from "../DashboardCard";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import EmployeeServedHistory from "./EmployeeServedHistory";
import PendingServicesList from "./PendingServicesList";
import AttendanceCard from "./AttendanceCard";
import { motion } from "motion/react";

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
  return (
    <main className="w-screen h-screen flex items-center justify-center p-4 md:p-8 lg:p-12 bg-zinc-50/50">
      <section className="w-full h-full border border-gray-200 shadow-xl bg-white rounded-3xl p-4 md:p-6 flex flex-col overflow-hidden">
        <header className="mb-6 md:mb-8 flex justify-between items-center shrink-0">
          <div className="">
            <h1 className="font-semibold text-xl md:text-2xl text-zinc-800">
              {businessName} | Employee Dashboard
            </h1>
          </div>
          <Button
            asChild
            className="rounded-full shadow-lg shadow-blue-500/20 px-3 md:px-4"
          >
            <Link href={`/${businessSlug}/booking`}>
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Add Booking</span>
            </Link>
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 w-full mb-8"
          >
            <motion.div layout className="h-full">
              <DashboardCard
                title="Total Projects"
                count={servedHistory.length}
                description="All time served"
                variant="filled"
              />
            </motion.div>
            <motion.div layout className="h-full">
              <DashboardCard
                title="Available Tasks"
                count={pendingServices.length}
                description="Waiting to be claimed"
                variant="light"
              />
            </motion.div>
            <motion.div layout className="h-full">
              <DashboardCard
                title="Total Earnings"
                count={`₱${currentEmployeeSalary.toLocaleString()}`}
                description="Commission accumulated"
                variant="light"
              />
            </motion.div>
            <AttendanceCard
              employeeId={currentEmployeeId}
              businessSlug={businessSlug}
              todayAttendance={todayAttendance}
            />
          </motion.div>

          <motion.div
            layout
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[400px]"
          >
            <EmployeeServedHistory
              services={servedHistory}
              currentEmployeeId={currentEmployeeId}
              currentEmployeeCommission={currentEmployeeCommission}
            />
            <PendingServicesList
              services={pendingServices}
              businessSlug={businessSlug}
              currentEmployeeId={currentEmployeeId}
            />
          </motion.div>
        </div>
      </section>
    </main>
  );
}
