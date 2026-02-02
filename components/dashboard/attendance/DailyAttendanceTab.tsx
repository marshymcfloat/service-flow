"use client";

import { useState, useOptimistic, useTransition } from "react";
import { format, addDays, subDays, isSameDay } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Employee,
  EmployeeAttendance,
  AttendanceStatus,
} from "@/prisma/generated/prisma/client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDailyAttendance,
  updateAttendanceStatus,
} from "@/app/actions/attendance";

type AttendanceData = {
  employee: Employee & { user: { name: string } };
  attendance: EmployeeAttendance | null;
};

interface DailyAttendanceTabProps {
  businessId: string;
  initialData: AttendanceData[];
  currentDate: Date;
}

export function DailyAttendanceTab({
  businessId,
  initialData,
  currentDate,
}: DailyAttendanceTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Optimistic data handling
  const [optimisticData, addOptimisticUpdate] = useOptimistic(
    initialData,
    (state, update: { employeeId: number; status: AttendanceStatus }) => {
      return state.map((item) => {
        if (item.employee.id === update.employeeId) {
          // Create optimistic attendance or update existing
          const baseAttendance = item.attendance || {
            id: 0,
            employee_id: update.employeeId,
            date: currentDate,
            time_in: null,
            time_out: null,
            location_verified: false,
            latitude: null,
            longitude: null,
            created_at: new Date(),
            updated_at: new Date(),
          };

          return {
            ...item,
            attendance: {
              ...baseAttendance,
              status: update.status,
            } as EmployeeAttendance,
          };
        }
        return item;
      });
    },
  );

  const handleDateChange = (newDate: Date) => {
    startTransition(() => {
      // Use ISO string for consistent parsing, simplified YYYY-MM-DD?
      // Or just let Date constructor parse? best to be safe with standard formats or just router.push
      const dateString = newDate.toISOString();
      // Actually better to use searchParams to keep current tab?
      // Tabs state is local controlled in OwnerAttendanceClient but URL does not track tab.
      // switching params keeps same page layout.
      router.push(`?date=${dateString}`);
    });
  };

  const refreshData = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const handleStatusChange = async (
    employeeId: number,
    newStatus: AttendanceStatus,
  ) => {
    // Optimistic update
    addOptimisticUpdate({ employeeId, status: newStatus });

    const result = await updateAttendanceStatus(
      employeeId,
      currentDate,
      newStatus,
    );
    if (!result.success) {
      toast.error("Failed to update status");
      router.refresh(); // Revert on failure by refreshing
    }
  };

  // Summary logic
  const summary = {
    PRESENT: optimisticData.filter((d) => d.attendance?.status === "PRESENT")
      .length,
    LATE: optimisticData.filter((d) => d.attendance?.status === "LATE").length,
    ABSENT: optimisticData.filter((d) => d.attendance?.status === "ABSENT")
      .length,
    LEAVE: optimisticData.filter((d) => d.attendance?.status === "LEAVE")
      .length,
    OFF: optimisticData.filter((d) => d.attendance?.status === "OFF").length,
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-emerald-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-cyan-500",
      "bg-indigo-500",
      "bg-teal-500",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-6">
      {/* Date Navigator */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-1.5 rounded-2xl border border-zinc-200 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]">
        <div className="flex items-center gap-1 p-1 bg-zinc-100/80 rounded-xl border border-zinc-200/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDateChange(subDays(currentDate, 1))}
            disabled={isPending}
            className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm text-zinc-600 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-8 px-3 text-sm font-medium text-zinc-700 hover:bg-white hover:shadow-sm rounded-lg transition-all border border-transparent hover:border-zinc-200/50",
                  !currentDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-zinc-500" />
                {currentDate ? (
                  format(currentDate, "MMMM do, yyyy")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && handleDateChange(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDateChange(addDays(currentDate, 1))}
            disabled={isPending}
            className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm text-zinc-600 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 pr-2">
          {!isSameDay(currentDate, new Date()) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDateChange(new Date())}
              disabled={isPending}
              className="h-8 text-xs font-medium rounded-lg border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900"
            >
              Go to Today
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshData}
            disabled={isPending}
            className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <RefreshCw
              className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <SummaryCard
          title="Present"
          count={summary.PRESENT}
          indicatorColor="bg-emerald-500"
        />
        <SummaryCard
          title="Late"
          count={summary.LATE}
          indicatorColor="bg-amber-500"
        />
        <SummaryCard
          title="Absent"
          count={summary.ABSENT}
          indicatorColor="bg-rose-500"
        />
        <SummaryCard
          title="On Leave"
          count={summary.LEAVE}
          indicatorColor="bg-blue-500"
        />
        <SummaryCard
          title="Off"
          count={summary.OFF}
          indicatorColor="bg-zinc-400"
        />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {optimisticData.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-zinc-100">
            <User className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-zinc-900">
              No employees found
            </h3>
            <p className="text-zinc-500">
              Try selecting a different date or refreshing.
            </p>
          </div>
        ) : (
          optimisticData.map(({ employee, attendance }) => (
            <div
              key={employee.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <Avatar
                    className={`${getAvatarColor(employee.user.name)} h-10 w-10 text-white shadow-sm ring-2 ring-white`}
                  >
                    <AvatarFallback className="bg-transparent font-medium">
                      {getInitials(employee.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold text-zinc-900">
                      {employee.user.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Select
                        defaultValue={attendance?.status || "ABSENT"}
                        value={attendance?.status || "ABSENT"}
                        onValueChange={(val) =>
                          handleStatusChange(
                            employee.id,
                            val as AttendanceStatus,
                          )
                        }
                      >
                        <SelectTrigger className="h-7 w-[110px] text-xs bg-zinc-50 border-zinc-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRESENT">Present</SelectItem>
                          <SelectItem value="LATE">Late</SelectItem>
                          <SelectItem value="ABSENT">Absent</SelectItem>
                          <SelectItem value="LEAVE">On Leave</SelectItem>
                          <SelectItem value="OFF">Day Off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-3 border-t border-zinc-50">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Time In
                  </span>
                  <span className="text-sm font-medium text-zinc-900">
                    {attendance?.time_in
                      ? format(new Date(attendance.time_in), "hh:mm a")
                      : "-"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Time Out
                  </span>
                  <span className="text-sm font-medium text-zinc-900">
                    {attendance?.time_out
                      ? format(new Date(attendance.time_out), "hh:mm a")
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-3xl border border-zinc-100 overflow-hidden shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-zinc-50/80 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow className="hover:bg-transparent border-zinc-100">
              <TableHead className="pl-6 h-12 font-semibold text-zinc-500">
                Employee
              </TableHead>
              <TableHead className="h-12 font-semibold text-zinc-500">
                Time In
              </TableHead>
              <TableHead className="h-12 font-semibold text-zinc-500">
                Time Out
              </TableHead>
              <TableHead className="h-12 font-semibold text-zinc-500 w-[200px]">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimisticData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              optimisticData.map(({ employee, attendance }) => (
                <TableRow
                  key={employee.id}
                  className="hover:bg-zinc-50/50 transition-colors border-zinc-100"
                >
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        className={`${getAvatarColor(employee.user.name)} h-9 w-9 text-white shadow-sm ring-2 ring-white`}
                      >
                        <AvatarFallback className="bg-transparent font-medium">
                          {getInitials(employee.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-zinc-900">
                        {employee.user.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-zinc-600">
                    {attendance?.time_in ? (
                      <span className="bg-zinc-100 text-zinc-700 px-2 py-1 rounded-md text-xs font-medium font-mono">
                        {format(new Date(attendance.time_in), "hh:mm a")}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="py-4 text-zinc-600">
                    {attendance?.time_out ? (
                      <span className="bg-zinc-100 text-zinc-700 px-2 py-1 rounded-md text-xs font-medium font-mono">
                        {format(new Date(attendance.time_out), "hh:mm a")}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="py-4">
                    <Select
                      defaultValue={attendance?.status || "ABSENT"}
                      value={attendance?.status || "ABSENT"}
                      onValueChange={(val) =>
                        handleStatusChange(employee.id, val as AttendanceStatus)
                      }
                    >
                      <SelectTrigger className="w-[140px] border-zinc-200 shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRESENT">Present</SelectItem>
                        <SelectItem value="LATE">Late</SelectItem>
                        <SelectItem value="ABSENT">Absent</SelectItem>
                        <SelectItem value="LEAVE">On Leave</SelectItem>
                        <SelectItem value="OFF">Day Off</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  count,
  indicatorColor,
}: {
  title: string;
  count: number;
  indicatorColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 hover:border-emerald-100 transition-colors duration-300">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-1.5 h-1.5 rounded-full ${indicatorColor}`} />
        <span className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
          {title}
        </span>
      </div>
      <div className="flex items-baseline gap-2 pl-4">
        <span className="text-3xl font-bold text-zinc-900">{count}</span>
      </div>
    </div>
  );
}
