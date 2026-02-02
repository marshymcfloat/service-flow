import { Button } from "@/components/ui/button";
import { PhilippinePeso, Plus, Calendar, Users } from "lucide-react";
import Link from "next/link";
import DashboardCard from "../DashboardCard";
import { SalesChart } from "./SalesChart";
import {
  Booking,
  Customer,
  AvailedService,
  Service,
  Employee,
  User,
} from "@/prisma/generated/prisma/client";
import { BookingList } from "./BookingList";
import { cn } from "@/lib/utils";

type BookingWithDetails = Booking & {
  customer: Customer;
  availed_services: (AvailedService & {
    service: Service;
    served_by: (Employee & { user: User }) | null;
  })[];
};

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
  allBookings: BookingWithDetails[];
}) {
  return (
    <div className="min-h-screen bg-zinc-50/50 pb-8">
      {/* Header Section */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="font-bold text-xl md:text-2xl text-zinc-900 tracking-tight">
            {businessName}
            <span className="text-zinc-400 font-normal ml-2 text-lg">
              Dashboard
            </span>
          </h1>

          <Button
            asChild
            className="rounded-full shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white px-4 md:px-6 h-10 transition-transform active:scale-95"
          >
            <Link href={`/${businessSlug}/booking`}>
              <Plus className="h-4 w-4 md:mr-2" strokeWidth={3} />
              <span className="hidden md:inline font-semibold">
                New Booking
              </span>
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardCard
            variant="filled"
            Icon={PhilippinePeso}
            description="Total Sales vs. yesterday"
            title="Revenue"
            count={totalSales}
          />

          <DashboardCard
            Icon={Calendar}
            description="Appointments for today"
            title="Bookings"
            count={bookingsToday}
          />

          <DashboardCard
            Icon={Users}
            description="Staff currently present"
            title="Active Staff"
            count={presentEmployeesToday}
          />
        </section>

        {/* Charts & Lists Grid */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 min-h-[500px]">
          <div className="h-[450px] xl:h-auto">
            <SalesChart bookings={bookings} className="h-full" />
          </div>
          <div className="h-[500px] xl:h-[600px]">
            <BookingList bookings={allBookings} />
          </div>
        </section>
      </main>
    </div>
  );
}
