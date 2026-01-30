"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Loader2,
  PlayCircle,
  StopCircle,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import {
  clockInAction,
  clockOutAction,
  getMonthlyAttendanceAction,
} from "@/lib/server actions/attendance";
import AttendanceCalendar from "./AttendanceCalendar";
import { motion, AnimatePresence } from "motion/react";

interface AttendanceCardProps {
  employeeId: number;
  businessSlug: string;
  todayAttendance: {
    time_in: Date | null;
    time_out: Date | null;
  } | null;
}

export default function AttendanceCard({
  employeeId,
  businessSlug,
  todayAttendance,
  className,
}: AttendanceCardProps & { className?: string }) {
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [monthlyAttendance, setMonthlyAttendance] = useState<any[]>([]);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const isClockedIn = !!todayAttendance?.time_in && !todayAttendance.time_out;
  const isClockedOut = !!todayAttendance?.time_out;

  useEffect(() => {
    const fetchAttendance = async () => {
      const result = await getMonthlyAttendanceAction(
        employeeId,
        calendarDate.getFullYear(),
        calendarDate.getMonth(),
      );
      if (result.success && result.data) {
        setMonthlyAttendance(result.data);
      }
    };

    fetchAttendance();
  }, [employeeId, calendarDate, todayAttendance]);

  const handleClockIn = async () => {
    setLoading(true);

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const result = await clockInAction(
          employeeId,
          latitude,
          longitude,
          businessSlug,
        );

        if (result.success) {
          toast.success("Clocked in successfully!");
        } else {
          toast.error(result.error);
        }
        setLoading(false);
      },
      (error) => {
        console.error(error);
        toast.error("Unable to retrieve location. Please allow access.");
        setLoading(false);
      },
    );
  };

  const handleClockOut = async () => {
    setLoading(true);
    const result = await clockOutAction(employeeId);
    if (result.success) {
      toast.success("Clocked out successfully!");
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <motion.div
      layout="position"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`p-4 rounded-2xl flex flex-col justify-between  bg-card text-card-foreground border shadow-sm relative overflow-hidden transition-all duration-300 ${
        showCalendar ? "row-span-2" : "min-h-[140px]"
      } ${className}`}
    >
      <div className="flex justify-between items-start w-full relative z-10 mb-4">
        <div>
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
            Attendance
          </h3>
          <p className="text-xl font-bold mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <motion.button
          layout="position"
          onClick={() => setShowCalendar(!showCalendar)}
          className="size-8 rounded-full flex items-center justify-center border bg-background hover:bg-muted transition-colors"
        >
          {showCalendar ? <MapPin size={16} /> : <CalendarDays size={16} />}
        </motion.button>
      </div>

      <div className="flex flex-col gap-6 relative z-10 h-full">
        <div className="w-full space-y-4">
          <div className="flex items-center gap-2">
            {isClockedOut ? (
              <div className="text-zinc-500 font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-zinc-400"></div>
                Done for today
              </div>
            ) : isClockedIn ? (
              <div className="text-green-600 font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></div>
                Clocked In –{" "}
                {todayAttendance?.time_in
                  ? new Date(todayAttendance.time_in).toLocaleTimeString(
                      "en-US",
                      { hour: "2-digit", minute: "2-digit" },
                    )
                  : ""}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-zinc-500 font-medium">
                <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                Not started
              </div>
            )}
          </div>

          {!isClockedOut && (
            <div>
              <Button
                onClick={isClockedIn ? handleClockOut : handleClockIn}
                disabled={loading}
                className={`w-full py-2 px-4 h-auto text-sm font-medium transition-all rounded-xl ${
                  isClockedIn
                    ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 shadow-sm"
                    : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-md hover:shadow-lg"
                }`}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : isClockedIn ? (
                  <StopCircle className="w-4 h-4 mr-2" />
                ) : (
                  <PlayCircle className="w-4 h-4 mr-2" />
                )}
                {loading
                  ? "Processing..."
                  : isClockedIn
                    ? "Clock Out"
                    : "Clock In"}
              </Button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showCalendar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full shrink-0 border-t border-zinc-100 pt-6 overflow-hidden"
            >
              <AttendanceCalendar
                attendanceRecords={monthlyAttendance}
                currentDate={calendarDate}
                onMonthChange={setCalendarDate}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
