import { Button } from "@/components/ui/button";
import { PhilippinePeso, Plus } from "lucide-react";
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
  Payslip,
} from "@/prisma/generated/prisma/client";

import { BookingList } from "./BookingList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PayrollList } from "./PayrollList";

type BookingWithDetails = Booking & {
  customer: Customer;
  availed_services: (AvailedService & {
    service: Service;
    served_by: (Employee & { user: User }) | null;
  })[];
};

type EmployeeWithDetails = Employee & {
  user: User;
  payslips: Payslip[];
};

export default function OwnerDashboard({
  businessName,
  businessSlug,
  totalSales,
  bookingsToday,
  presentEmployeesToday,
  bookings,
  allBookings,
  employees,
}: {
  businessName: string;
  businessSlug: string;
  totalSales: number;
  bookingsToday: number;
  presentEmployeesToday: number;
  bookings: { id: number; created_at: Date; grand_total: number }[];
  allBookings: BookingWithDetails[];
  employees: EmployeeWithDetails[];
}) {
  return (
    <div className="h-full flex flex-col md:p-8 bg-zinc-50/50">
      <section className="flex-1 flex flex-col bg-white overflow-hidden md:rounded-3xl md:border md:border-gray-200 md:shadow-xl p-4 md:p-6 max-h-[calc(100vh-4rem)]">
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

        <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pr-1 md:pr-2">
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

          <Tabs defaultValue="bookings" className="w-full flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <TabsList>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="payroll">Payroll</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="bookings"
              className="flex-1 mt-0 min-h-0 overflow-hidden"
            >
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full max-h-[500px]">
                <div className="xl:col-span-2 max-h-[50 0px] xl:h-full min-h-0 ">
                  <SalesChart bookings={bookings} className="h-full w-full" />
                </div>
                <div className="xl:col-span-2 h-[400px] xl:h-full max-h-[500px] min-h-0 overflow-hidden">
                  <BookingList bookings={allBookings} />
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="payroll"
              className="flex-1 mt-0 h-full min-h-0  overflow-hidden"
            >
              <div className="h-[500px] xl:h-full min-h-0">
                <PayrollList employees={employees} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
