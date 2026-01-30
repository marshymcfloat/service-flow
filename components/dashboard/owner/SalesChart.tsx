"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
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
      const startOfWindow = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        return d;
      });

      const dayNames = last7Days.map((d) => formatPH(d, "EEE"));
      chartData = dayNames.map((name) => ({ name, total: 0 }));
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      chartData = days.map((d) => ({ name: d, total: 0 }));

      filteredBookings = bookings.filter((b) => {
        const diffTime = Math.abs(
          now.getTime() - new Date(b.created_at).getTime(),
        );
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      });

      filteredBookings.forEach((b) => {
        const name = formatPH(b.created_at, "EEE");
        const bucket = chartData.find((d) => d.name === name);
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
        "h-full shadow-sm   border-zinc-100 flex flex-col",
        className,
      )}
    >
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">
              Revenue Analytics
            </CardTitle>
            <CardDescription>
              Overview of your business performance
            </CardDescription>
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[160px] rounded-lg">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Today</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4">
          <div>
            <div className="text-sm text-muted-foreground font-medium">
              Total Revenue
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              ₱{totalRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {/* +12.5% from last period */}
              {range === "daily"
                ? "Today"
                : range === "monthly"
                  ? "This Month"
                  : "This Year"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground font-medium">
              Total Orders
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {totalOrders.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {range === "daily"
                ? "Today"
                : range === "monthly"
                  ? "This Month"
                  : "This Year"}
            </div>
          </div>
          <div className="hidden md:block">
            <div className="text-sm text-muted-foreground font-medium">
              Avg. Order Value
            </div>
            <div className="text-2xl font-bold text-indigo-600">
              ₱
              {averageOrderValue.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {range === "daily"
                ? "Today"
                : range === "monthly"
                  ? "This Month"
                  : "This Year"}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-0 pb-2 flex-1 min-h-0">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 10, bottom: 0 }}
            >
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  `₱${value >= 1000 ? `${value / 1000}k` : value}`
                }
                width={60}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.2 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-xl">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground font-bold">
                              Revenue
                            </span>
                            <span className="font-bold text-emerald-600">
                              ₱{Number(payload[0].value).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="total"
                fill="currentColor"
                radius={[6, 6, 0, 0]}
                className="fill-primary"
                barSize={range === "daily" ? 20 : range === "yearly" ? 60 : 40}
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
