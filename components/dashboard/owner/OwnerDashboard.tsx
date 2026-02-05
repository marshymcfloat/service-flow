import { Button } from "@/components/ui/button";
import { PhilippinePeso, Plus, Calendar, Users } from "lucide-react";
import Link from "next/link";
import DashboardCard from "../DashboardCard";
import { SalesChart } from "./SalesChart";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Booking,
  Customer,
  AvailedService,
  Service,
  Employee,
  User,
  Voucher,
  Owner,
} from "@/prisma/generated/prisma/client";
import { BookingList } from "./BookingList";
import OwnerServiceQueue, {
  OwnerClaimedService,
  OwnerPendingService,
} from "./OwnerServiceQueue";

type BookingWithDetails = Booking & {
  customer: Customer;
  vouchers: Voucher[];
  availed_services: (AvailedService & {
    service: Service;
    served_by: (Employee & { user: User }) | null;
    served_by_owner: (Owner & { user: User }) | null;
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
  pendingServices,
  ownerClaimedServices,
}: {
  businessName: string;
  businessSlug: string;
  totalSales: number;
  bookingsToday: number;
  presentEmployeesToday: number;
  bookings: { id: number; created_at: Date; grand_total: number }[];
  allBookings: BookingWithDetails[];
  pendingServices: OwnerPendingService[];
  ownerClaimedServices: OwnerClaimedService[];
}) {
  return (
    <div className="min-h-screen bg-zinc-50/50 pb-8 relative">
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-zinc-100 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-9 w-9 rounded-lg border border-zinc-200 hover:bg-zinc-100/80 transition-colors" />
            <h1 className="font-bold text-xl md:text-2xl text-zinc-900 tracking-tight">
              {businessName}
              <span className="hidden sm:inline text-zinc-400 font-normal ml-2 text-lg">
                Dashboard
              </span>
            </h1>
          </div>

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

      <main className="max-w-400 mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-24 pb-8 space-y-8">
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

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="lg:col-span-2 h-[520px] xl:h-[640px]">
            <BookingList bookings={allBookings} />
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-full">
            <OwnerServiceQueue
              businessSlug={businessSlug}
              pendingServices={pendingServices}
              claimedServices={ownerClaimedServices}
              className="h-full"
            />
          </div>
          <div className="h-[450px] lg:h-full">
            <SalesChart bookings={bookings} className="h-full" />
          </div>
        </section>
      </main>
    </div>
  );
}
