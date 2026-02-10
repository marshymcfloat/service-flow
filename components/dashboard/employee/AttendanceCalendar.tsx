"use client";

import { cn } from "@/lib/utils";
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

interface AttendanceRecord {
  date: Date | string;
  status: string;
  time_in?: Date | string | null;
  time_out?: Date | string | null;
}

interface AttendanceCalendarProps {
  attendanceRecords: AttendanceRecord[];
  currentDate?: Date;
  onMonthChange?: (date: Date) => void;
}

export default function AttendanceCalendar({
  attendanceRecords,
  currentDate = new Date(),
  onMonthChange,
}: AttendanceCalendarProps) {
  const [displayedMonth, setDisplayedMonth] = useState(
    startOfMonth(currentDate),
  );

  useEffect(() => {
    setDisplayedMonth(startOfMonth(currentDate));
  }, [currentDate]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(displayedMonth),
    end: endOfMonth(displayedMonth),
  });

  const getStatusColor = (day: Date) => {
    if (!isSameMonth(day, displayedMonth))
      return "text-zinc-300 bg-transparent";

    const record = attendanceRecords.find((r) =>
      isSameDay(new Date(r.date), day),
    );

    if (record) {
      switch (record.status) {
        case "PRESENT":
          return "bg-green-100/50 text-green-700 border-green-200";
        case "ABSENT":
          return "bg-red-100/50 text-red-700 border-red-200";
        case "LATE":
          return "bg-yellow-100/50 text-yellow-700 border-yellow-200";
        case "OFF":
          return "bg-gray-100 text-gray-500 border-gray-200";
        default:
          return "bg-zinc-50 text-zinc-900 border-zinc-100";
      }
    }

    if (isToday(day)) {
      return "bg-zinc-100 text-zinc-900 font-bold border-zinc-200";
    }

    return "bg-zinc-50/50 text-zinc-500 border-transparent hover:bg-zinc-50";
  };

  const nextMonth = () => {
    const newDate = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth() + 1,
      1,
    );
    setDisplayedMonth(newDate);
    onMonthChange?.(newDate);
  };

  const prevMonth = () => {
    const newDate = new Date(
      displayedMonth.getFullYear(),
      displayedMonth.getMonth() - 1,
      1,
    );
    setDisplayedMonth(newDate);
    onMonthChange?.(newDate);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-zinc-800">
          {format(displayedMonth, "MMMM yyyy")}
        </h4>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs text-zinc-400 mb-2">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      <div className="grid grid-cols-7 gap-2 flex-1">
        {daysInMonth.map((day, idx) => {
          // align first day
          const colStart = idx === 0 ? `col-start-${day.getDay() + 1}` : "";

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "aspect-square rounded-xl flex flex-col items-center justify-center text-xs border transition-colors",
                getStatusColor(day),
                colStart,
              )}
            >
              <span className="font-medium">{format(day, "d")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
