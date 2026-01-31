"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyAttendanceTab } from "./DailyAttendanceTab";
import { LeaveRequestsTab } from "./LeaveRequestsTab";
import { Prisma } from "@/prisma/generated/prisma/client";

type LeaveRequestWithEmployee = Prisma.LeaveRequestGetPayload<{
  include: {
    employee: {
      include: {
        user: true;
      };
    };
  };
}>;

import { Employee, EmployeeAttendance } from "@/prisma/generated/prisma/client";

type AttendanceData = {
  employee: Employee & { user: { name: string } };
  attendance: EmployeeAttendance | null;
};

interface OwnerAttendanceClientProps {
  businessId: string;
  businessSlug: string;
  leaveRequests: LeaveRequestWithEmployee[];
  initialDailyAttendance: AttendanceData[];
  currentDate: Date;
}

export function OwnerAttendanceClient({
  businessId,
  businessSlug,
  leaveRequests,
  initialDailyAttendance,
  currentDate,
}: OwnerAttendanceClientProps) {
  return (
    <div className="h-full flex flex-col p-4 md:p-8 bg-zinc-50/50">
      <section className="flex-1 flex flex-col bg-white overflow-hidden rounded-xl md:rounded-3xl border border-gray-200 shadow-xl p-4 md:p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
              <p className="text-muted-foreground">
                Monitor daily attendance and manage leave requests.
              </p>
            </div>
          </div>

          <Tabs defaultValue="daily" className="space-y-4">
            <TabsList>
              <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
              <TabsTrigger value="requests">
                Leave Requests
                {leaveRequests.some((r) => r.status === "PENDING") && (
                  <span className="ml-2 h-2 w-2 rounded-full bg-red-600" />
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="space-y-4">
              <DailyAttendanceTab
                businessId={businessId}
                initialData={initialDailyAttendance}
                currentDate={currentDate}
              />
            </TabsContent>
            <TabsContent value="requests" className="space-y-4">
              <LeaveRequestsTab
                requests={leaveRequests}
                params={{ businessSlug }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
