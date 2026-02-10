import { cn } from "@/lib/utils";
import { PhilippinePeso, Calendar, Users, Bell } from "lucide-react";
import DashboardCard from "../DashboardCard";
import { SalesChart } from "./SalesChart";

import { formatPH } from "@/lib/date-utils";
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
import { BookingDialog } from "./BookingDialog";
import {
  getCachedServices,
  getCachedPackages,
  getCachedBusinessBySlug,
} from "@/lib/data/cached";
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

export default async function OwnerDashboard({
  businessName,
  businessSlug,
  totalSales,
  bookingsToday,
  presentEmployeesToday,
  bookings,
  allBookings,
  pendingServices,
  ownerClaimedServices,
  payroll,
  flowRemindersThisWeek,
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
  payroll: {
    id: number;
    total_salary: number;
    starting_date: Date;
    ending_date: Date;
    employee: {
      user: {
        name: string;
      };
    };
  }[];
  flowRemindersThisWeek: number;
}) {
  const business = await getCachedBusinessBySlug(businessSlug);
  const services = business ? await getCachedServices(business.id) : [];
  const packages = business ? await getCachedPackages(business.id) : [];
  const categories = Array.from(new Set(services.map((s) => s.category)));

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 py-3 flex items-center justify-between md:px-8 md:py-4 shadow-[0_2px_20px_-12px_rgba(0,0,0,0.1)] transition-all duration-300">
        <div className="flex flex-col">
          <h1 className="font-bold text-lg leading-none md:text-xl text-slate-900 tracking-tight">
            {businessName}
          </h1>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-indigo-500 mt-1">
            Owner Dashboard
          </p>
        </div>

        <div className="flex items-center gap-3">
          <BookingDialog
            services={services}
            packages={packages}
            categories={categories}
            businessSlug={businessSlug}
          />
        </div>
      </header>

      <main className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            variant="filled"
            Icon={PhilippinePeso}
            description="Total sales this period"
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

          <DashboardCard
            Icon={Bell}
            description="Follow-up reminders sent"
            title="Flow Reminders"
            count={flowRemindersThisWeek}
          />
        </section>

        <SnapshotSection
          bookingsToday={bookingsToday}
          presentEmployeesToday={presentEmployeesToday}
          pendingServices={pendingServices}
          ownerClaimedServices={ownerClaimedServices}
          className="lg:hidden"
        />

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <section className="rounded-[28px] border border-zinc-100 bg-white p-4 sm:p-6 h-[clamp(520px,70vh,860px)]">
              <BookingList
                bookings={allBookings}
                variant="embedded"
                className="h-full"
              />
            </section>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <SnapshotSection
              bookingsToday={bookingsToday}
              presentEmployeesToday={presentEmployeesToday}
              pendingServices={pendingServices}
              ownerClaimedServices={ownerClaimedServices}
              className="hidden lg:block"
            />

            <section className="rounded-[28px] border border-zinc-100 bg-white p-4 sm:p-6">
              <OwnerServiceQueue
                businessSlug={businessSlug}
                pendingServices={pendingServices}
                claimedServices={ownerClaimedServices}
                variant="embedded"
                className="h-[clamp(400px,53vh,600px)]"
              />
            </section>

            <section className="rounded-[28px] border border-zinc-100 bg-white p-4 sm:p-6">
              <SalesChart
                bookings={bookings}
                allBookings={allBookings}
                payroll={payroll}
                variant="embedded"
                className="h-[clamp(450px,40vh,500px)]"
              />
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

function SnapshotSection({
  bookingsToday,
  presentEmployeesToday,
  pendingServices,
  ownerClaimedServices,
  className,
}: {
  bookingsToday: number;
  presentEmployeesToday: number;
  pendingServices: OwnerPendingService[];
  ownerClaimedServices: OwnerClaimedService[];
  className?: string;
}) {
  const todayLabel = formatPH(new Date(), "MMM d, yyyy");

  return (
    <section
      className={cn(
        "rounded-[24px] border border-zinc-100 bg-white p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
            Today
          </p>
          <p className="text-sm font-semibold text-zinc-900">{todayLabel}</p>
        </div>
        <span className="text-xs text-zinc-500">Snapshot</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Bookings
          </div>
          <div className="text-lg font-bold text-zinc-900">
            {bookingsToday.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Active Staff
          </div>
          <div className="text-lg font-bold text-zinc-900">
            {presentEmployeesToday.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Queue Pending
          </div>
          <div className="text-lg font-bold text-zinc-900">
            {pendingServices.length.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            Claimed
          </div>
          <div className="text-lg font-bold text-zinc-900">
            {ownerClaimedServices.length.toLocaleString()}
          </div>
        </div>
      </div>
    </section>
  );
}
