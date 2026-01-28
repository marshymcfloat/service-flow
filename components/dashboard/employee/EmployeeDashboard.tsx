import React from "react";
import DashboardCard from "../DashboardCard";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function EmployeeDashboard({
  businessName,
  businessSlug,
}: {
  businessName: string | null;
  businessSlug: string;
}) {
  console.log(businessSlug);
  return (
    <main className="w-screen h-screen flex items-center justify-center p-12">
      <section className="w-full h-full border border-gray-600 shadow-2xl rounded-2xl p-4">
        <header className="mb-8 flex justify-between items-center">
          <div className="">
            <h1 className="font-medium text-xl ">
              {businessName} | Employee Dashboard
            </h1>
          </div>
          <Button asChild>
            <Link href={`/${businessSlug}/booking`}>
              <Plus /> Add Booking
            </Link>
          </Button>
        </header>
        <div className="flex gap-6 flex-wrap w-full ">
          <DashboardCard
            title="Total Projects"
            count={24}
            description="Increased from last month"
            variant="filled"
          />
          <DashboardCard
            title="Ended Projects"
            count={10}
            description="Increased from last month"
            variant="light"
          />
        </div>
        <div className=""></div>
      </section>
    </main>
  );
}
