import { Button } from "@/components/ui/button";
import { PhilippinePeso, Plus } from "lucide-react";
import Link from "next/link";
import DashboardCard from "../DashboardCard";

import { SalesChart } from "./SalesChart";
import { Booking, Customer } from "@/prisma/generated/prisma/client";
import { BookingList } from "./BookingList";

export default function OwnerDashboard({
  businessName,
  businessSlug,
  totalSales,
  bookingsToday,
  presentEmployeesToday,
  bookings,
  allBookings,
}: {
  businessName: string;
  businessSlug: string;
  totalSales: number;
  bookingsToday: number;
  presentEmployeesToday: number;
  bookings: { id: number; created_at: Date; grand_total: number }[];
  allBookings: (Booking & { customer: Customer })[];
}) {
  return (
    <main className="w-screen h-screen flex items-center justify-center p-4 md:p-8 lg:p-12 bg-zinc-50/50">
      <section className="w-full h-full border border-gray-200 shadow-xl bg-white rounded-3xl p-4 md:p-6 flex flex-col overflow-hidden">
        <header className="mb-6 flex justify-between items-center shrink-0">
          <h1 className="font-semibold text-xl md:text-2xl text-zinc-800">
            {businessName} | Owner Dashboard
          </h1>
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

        <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pr-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DashboardCard
              variant="filled"
              Icon={PhilippinePeso}
              description="vs. yesterday"
              title="Sales"
              count={totalSales}
            />

            <DashboardCard
              description="Booked today"
              title="Bookings"
              count={bookingsToday}
            />

            <DashboardCard
              description="Present today"
              title="Employees"
              count={presentEmployeesToday}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-[500px]">
            <div className="xl:col-span-2 h-full">
              <SalesChart bookings={bookings} className="h-full" />
            </div>
            <div className="xl:col-span-2 h-full min-h-0 overflow-hidden">
              <BookingList bookings={allBookings} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
