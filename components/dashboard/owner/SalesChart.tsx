"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPH } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

interface Booking {
  id: number;
  created_at: Date;
  grand_total: number;
}

export function SalesChart({
  bookings,
  className,
}: {
  bookings: Booking[];
  className?: string;
}) {
  const [range, setRange] = useState("monthly");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { data, totalRevenue, totalOrders, averageOrderValue } = useMemo(() => {
    const now = new Date();
    // Helper to get PH time parts
    const getPHParts = (date: Date) => {
      // Create a date string in PH time
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        hour12: false,
      });
      const parts = formatter.formatToParts(date);
      const get = (type: string) =>
        parseInt(parts.find((p) => p.type === type)?.value || "0");
      return {
        year: get("year"),
        month: get("month") - 1, // 0-indexed
        day: get("day"),
        hour: get("hour"),
      };
    };

    const currentPH = getPHParts(now);
    let filteredBookings = bookings;
    let chartData: { name: string; total: number }[] = [];

    if (range === "daily") {
      // Filter for "Today" PH time
      filteredBookings = bookings.filter((b) => {
        const bPH = getPHParts(new Date(b.created_at));
        return (
          bPH.day === currentPH.day &&
          bPH.month === currentPH.month &&
          bPH.year === currentPH.year
        );
      });

      // Buckets: 0-23 hours
      const buckets = Array.from({ length: 24 }, (_, i) => ({
        name: `${i}:00`,
        total: 0,
      }));

      filteredBookings.forEach((b) => {
        const bPH = getPHParts(new Date(b.created_at));
        buckets[bPH.hour].total += b.grand_total;
      });
      chartData = buckets;
    } else if (range === "weekly") {
      // Logic for weekly can be refined, but sticking to existing logic for now
      filteredBookings = bookings.filter((b) => {
        const diffTime = Math.abs(
          now.getTime() - new Date(b.created_at).getTime(),
        );
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      });

      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      // Reorder days to start 6 days ago
      const todayIndex = now.getDay();
      let orderedDays: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        orderedDays.push(days[d.getDay()]);
      }

      chartData = orderedDays.map((d) => ({ name: d, total: 0 }));

      filteredBookings.forEach((b) => {
        const dayName = days[new Date(b.created_at).getDay()];
        const bucket = chartData.find((d) => d.name === dayName);
        if (bucket) bucket.total += b.grand_total;
      });
    } else if (range === "monthly") {
      filteredBookings = bookings.filter((b) => {
        const bPH = getPHParts(new Date(b.created_at));
        return bPH.month === currentPH.month && bPH.year === currentPH.year;
      });
      const daysInMonth = new Date(
        currentPH.year,
        currentPH.month + 1,
        0,
      ).getDate();
      chartData = Array.from({ length: daysInMonth }, (_, i) => ({
        name: String(i + 1),
        total: 0,
      }));

      filteredBookings.forEach((b) => {
        const bPH = getPHParts(new Date(b.created_at));
        if (chartData[bPH.day - 1]) {
          chartData[bPH.day - 1].total += b.grand_total;
        }
      });
    } else if (range === "yearly") {
      filteredBookings = bookings.filter((b) => {
        const bPH = getPHParts(new Date(b.created_at));
        return bPH.year === currentPH.year;
      });

      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      chartData = months.map((m) => ({ name: m, total: 0 }));

      filteredBookings.forEach((b) => {
        const bPH = getPHParts(new Date(b.created_at));
        chartData[bPH.month].total += b.grand_total;
      });
    }

    const tRevenue = filteredBookings.reduce(
      (acc, curr) => acc + curr.grand_total,
      0,
    );
    const tOrders = filteredBookings.length;
    const avgOrder = tOrders > 0 ? tRevenue / tOrders : 0;

    return {
      data: chartData,
      totalRevenue: tRevenue,
      totalOrders: tOrders,
      averageOrderValue: avgOrder,
    };
  }, [bookings, range]);

  return (
    <Card
      className={cn(
        "rounded-[32px] border-none shadow-lg shadow-zinc-200/50 bg-white flex flex-col overflow-hidden",
        className,
      )}
    >
      <CardHeader className="md:px-8 md:pt-8 pb-0">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900">
              Revenue Analytics
            </CardTitle>
            <CardDescription className="text-base text-zinc-500 font-medium">
              Overview of your business performance
            </CardDescription>
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-full sm:w-[160px] rounded-2xl h-11 border-zinc-200 bg-zinc-50 font-medium">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="daily">Today</SelectItem>
              <SelectItem value="weekly">Last 7 Days</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
          <div className="space-y-1">
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              Total Revenue
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-emerald-900">
              ₱{totalRevenue.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
              {range === "daily"
                ? "Today"
                : range === "monthly"
                  ? "This Month"
                  : range === "weekly"
                    ? "Last 7 Days"
                    : "This Year"}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              Total Orders
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-zinc-900">
              {totalOrders.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-zinc-600">Bookings</div>
          </div>
          <div className="hidden lg:block space-y-1">
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              Avg. Order Value
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-zinc-900">
              ₱
              {averageOrderValue.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="text-xs font-medium text-zinc-600">Per booking</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 md:px-6 py-6 flex-1 min-h-[300px]">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f4f4f5"
              />
              <XAxis
                dataKey="name"
                stroke="#a1a1aa"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={16}
                fontWeight={500}
              />
              <YAxis
                stroke="#a1a1aa"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  `₱${value >= 1000 ? `${value / 1000}k` : value}`
                }
                width={60}
                fontWeight={500}
              />
              <Tooltip
                cursor={{ fill: "#f4f4f5", radius: 8 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl border-none bg-zinc-900 p-4 shadow-xl text-white ring-1 ring-white/10">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase text-zinc-400 font-bold tracking-wider">
                            Revenue
                          </span>
                          <span className="font-bold text-lg text-emerald-400">
                            ₱{Number(payload[0].value).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="total"
                fill="#10b981"
                radius={[6, 6, 6, 6]}
                barSize={range === "daily" ? 24 : 40}
                className="fill-emerald-600 hover:fill-emerald-700 transition-all duration-300"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
            Loading chart...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
