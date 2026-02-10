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
import type { EmployeeAttendance } from "@/prisma/generated/prisma/client";
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
  const [monthlyAttendance, setMonthlyAttendance] = useState<
    EmployeeAttendance[]
  >([]);
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

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

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
      async (error) => {
        console.error("Geolocation error:", error);

        // Developer Bypass: If in dev mode, try to clock in with mock location
        if (process.env.NODE_ENV === "development") {
          toast.info("Dev Mode: Geolocation failed, using mock location.");
          // Use mock coordinates (0,0) - backend will skip check in dev
          const result = await clockInAction(employeeId, 0, 0, businessSlug);

          if (result.success) {
            toast.success("Clocked in successfully (Dev Bypass)!");
          } else {
            toast.error(result.error);
          }
          setLoading(false);
          return;
        }

        let errorMessage = "Unable to retrieve location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location permission denied. Please enable it in browser settings or OS settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
        }
        toast.error(errorMessage);
        setLoading(false);
      },
      options,
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
      className={`p-6 rounded-2xl flex flex-col justify-between bg-white text-slate-900 relative overflow-hidden transition-all duration-300 ${
        showCalendar ? "row-span-2" : "min-h-[160px]"
      } ${className}`}
    >
      <div className="flex justify-between items-start w-full relative z-10 mb-6">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Today&apos;s Attendance
          </h3>
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
            })}
          </p>
          <p className="text-sm text-slate-500 font-medium">
            {new Date().toLocaleDateString("en-US", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <motion.button
          layout="position"
          onClick={() => setShowCalendar(!showCalendar)}
          className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
            showCalendar
              ? "bg-slate-900 text-white shadow-lg"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {showCalendar ? <MapPin size={18} /> : <CalendarDays size={18} />}
        </motion.button>
      </div>

      <div className="flex flex-col gap-6 relative z-10 h-full">
        <div className="w-full space-y-5">
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            {isClockedOut ? (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-slate-400"></div>
                <span className="text-sm font-semibold text-slate-600">
                  Shift Completed
                </span>
              </>
            ) : isClockedIn ? (
              <>
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-green-700">
                    Clocked In
                  </span>
                  {todayAttendance?.time_in && (
                    <span className="text-xs text-green-600/80 font-medium">
                      Since{" "}
                      {new Date(todayAttendance.time_in).toLocaleTimeString(
                        "en-US",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-orange-400"></div>
                <span className="text-sm font-semibold text-slate-600">
                  Not Started
                </span>
              </>
            )}
          </div>

          {!isClockedOut && (
            <div>
              <Button
                onClick={isClockedIn ? handleClockOut : handleClockIn}
                disabled={loading}
                className={`w-full py-6 h-[50px]  text-base font-bold transition-all rounded-xl shadow-lg active:scale-[0.98] ${
                  isClockedIn
                    ? "bg-white text-red-600 hover:bg-red-50 border-2 border-red-100 shadow-red-100/50"
                    : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20"
                }`}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-3" />
                ) : isClockedIn ? (
                  <StopCircle className="w-5 h-5 mr-3" />
                ) : (
                  <PlayCircle className="w-5 h-5 mr-3" />
                )}
                {loading
                  ? "Processing..."
                  : isClockedIn
                    ? "End Shift"
                    : "Start Shift"}
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
              className="w-full shrink-0 border-t border-slate-100 pt-6 overflow-hidden"
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
