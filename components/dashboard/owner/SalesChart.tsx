"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Re-defining locally to avoid circular dependencies or large imports if not needed
interface Booking {
  id: number;
  created_at: Date;
  grand_total: number;
}

interface BookingWithDetails extends Booking {
  availed_services: {
    price: number;
    service: {
      category: string;
      name: string;
    };
  }[];
}

interface PayrollRecord {
  id: number;
  total_salary: number;
  ending_date: Date;
}

type ChartBucket = {
  name: string;
  total: number;
  expenses: number;
  net: number;
  originalIndex?: number;
  [key: string]: number | string | undefined;
};

export function SalesChart({
  bookings,
  allBookings = [],
  payroll = [],
  className,
  variant = "card",
}: {
  bookings: Booking[];
  allBookings?: BookingWithDetails[];
  payroll?: PayrollRecord[];
  className?: string;
  variant?: "card" | "embedded";
}) {
  const [range, setRange] = useState("monthly");
  const [showDetails, setShowDetails] = useState(false);
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const {
    data,
    totalRevenue,
    totalPayroll,
    netRevenue,
    averageOrderValue,
    categoryBreakdown,
  } = useMemo(() => {
    const now = new Date();
    const getPHParts = (date: Date) => {
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
        month: get("month") - 1,
        day: get("day"),
        hour: get("hour"),
      };
    };

    const currentPH = getPHParts(now);

    // Initial Filter
    // Use allBookings if available for detailed data, else fallback to bookings but cast it
    // The previous implementation logic suggests we should prefer allBookings if we want category data.
    // If allBookings is empty (not passed), we can't do category breakdown effectively if bookings doesn't have it.
    // However, if allBookings is passed, we use it.
    let filteredBookings: BookingWithDetails[] = [];

    if (allBookings.length > 0) {
      filteredBookings = allBookings;
    } else {
      // Fallback or just map existing bookings to have empty availed_services if needed,
      // but bookings only has id, created_at, grand_total.
      // We'll proceed with what we have.
      filteredBookings = bookings.map((b) => ({
        ...b,
        availed_services: [],
      }));
    }

    let filteredPayroll = payroll;

    // Filter logic
    const filterByRange = (date: Date) => {
      const dPH = getPHParts(new Date(date));
      if (range === "daily") {
        return (
          dPH.day === currentPH.day &&
          dPH.month === currentPH.month &&
          dPH.year === currentPH.year
        );
      } else if (range === "weekly") {
        const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      } else if (range === "monthly") {
        return dPH.month === currentPH.month && dPH.year === currentPH.year;
      } else if (range === "yearly") {
        return dPH.year === currentPH.year;
      }
      return false;
    };

    filteredBookings = filteredBookings.filter((b) =>
      filterByRange(b.created_at),
    );
    filteredPayroll = filteredPayroll.filter((p) =>
      filterByRange(p.ending_date),
    );

    // Calculate Totals
    const tRevenue = filteredBookings.reduce(
      (acc, curr) => acc + curr.grand_total,
      0,
    );
    const tPayroll = filteredPayroll.reduce(
      (acc, curr) => acc + curr.total_salary,
      0,
    );
    const nRevenue = tRevenue - tPayroll;
    const tOrders = filteredBookings.length;
    const avgOrder = tOrders > 0 ? tRevenue / tOrders : 0;

    // Category Breakdown
    const catBreakdown: Record<string, number> = {};
    filteredBookings.forEach((b) => {
      if (b.availed_services && b.availed_services.length > 0) {
        b.availed_services.forEach((s) => {
          const cat = s.service.category || "Uncategorized";
          catBreakdown[cat] = (catBreakdown[cat] || 0) + s.price;
        });
      } else {
        // If we don't have detailed services, maybe put it in Uncategorized?
        // But we shouldn't over-count if we are calculating from grand_total elsewhere.
        // Actually, let's just stick to what we have in availed_services.
      }
    });

    const getBucketKey = (date: Date) => {
      const dPH = getPHParts(new Date(date));
      if (range === "daily") return dPH.hour;
      if (range === "weekly") return new Date(date).getDay(); // 0-6
      if (range === "monthly") return dPH.day; // 1-31
      if (range === "yearly") return dPH.month; // 0-11
      return 0;
    };

    const initBuckets = (): ChartBucket[] => {
      let bucketArray: Array<{
        name: string;
        total: number;
        originalIndex?: number;
      }> = [];
      if (range === "daily")
        bucketArray = Array.from({ length: 24 }, (_, i) => ({
          name: `${i}:00`,
          total: 0,
        }));
      else if (range === "weekly") {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const ordered: Array<{
          name: string;
          total: number;
          originalIndex: number;
        }> = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - (6 - i));
          ordered.push({
            name: days[d.getDay()],
            total: 0,
            originalIndex: d.getDay(),
          });
        }
        bucketArray = ordered;
      } else if (range === "monthly") {
        const daysInMonth = new Date(
          currentPH.year,
          currentPH.month + 1,
          0,
        ).getDate();
        bucketArray = Array.from({ length: daysInMonth }, (_, i) => ({
          name: String(i + 1),
          total: 0,
        }));
      } else if (range === "yearly") {
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
        bucketArray = months.map((m) => ({ name: m, total: 0 }));
      }
      // Initialize expenses and net for all buckets
      return bucketArray.map((b) => ({ ...b, expenses: 0, net: 0 }));
    };

    const buckets = initBuckets();

    filteredPayroll.forEach((p) => {
      const pKey = getBucketKey(p.ending_date);
      let bucket;
      if (range === "weekly") {
        const dayIndex = new Date(p.ending_date).getDay();
        bucket = buckets.find((item) => item.originalIndex === dayIndex);
      } else if (range === "daily") {
        bucket = buckets[pKey];
      } else if (range === "monthly") {
        bucket = buckets[pKey - 1];
      } else if (range === "yearly") {
        bucket = buckets[pKey];
      }

      if (bucket) {
        bucket.expenses = (bucket.expenses || 0) + p.total_salary;
      }
    });

    filteredBookings.forEach((b) => {
      const bKey = getBucketKey(b.created_at);
      let bucket;
      if (range === "weekly") {
        const dayIndex = new Date(b.created_at).getDay();
        bucket = buckets.find((item) => item.originalIndex === dayIndex);
      } else if (range === "daily") {
        bucket = buckets[bKey];
      } else if (range === "monthly") {
        bucket = buckets[bKey - 1]; // day is 1-indexed
      } else if (range === "yearly") {
        bucket = buckets[bKey];
      }

      if (bucket) {
        bucket.total += b.grand_total;
        // Add category data to bucket
        if (b.availed_services && b.availed_services.length > 0) {
          b.availed_services.forEach((s) => {
            const cat = s.service.category || "Uncategorized";
            bucket[cat] = (bucket[cat] || 0) + s.price;
          });
        }
      }
    });

    // Calculate Net
    buckets.forEach((b) => {
      b.net = b.total - b.expenses;
    });

    const chartData = buckets;

    return {
      data: chartData,
      totalRevenue: tRevenue,
      totalPayroll: tPayroll,
      netRevenue: nRevenue,
      averageOrderValue: avgOrder,
      categoryBreakdown: catBreakdown,
    };
  }, [bookings, allBookings, payroll, range]);

  const isEmbedded = variant === "embedded";

  // Get all unique categories for Stacked Bar colors
  const categories = useMemo(() => {
    const cats = new Set<string>();
    data.forEach((d) => {
      Object.keys(d).forEach((k) => {
        if (k !== "name" && k !== "total" && k !== "originalIndex") cats.add(k);
      });
    });
    return Array.from(cats);
  }, [data]);

  const colors = [
    "#10b981",
    "#3b82f6",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#6366f1",
    "#14b8a6",
    "#f43f5e",
  ];

  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden min-h-0 min-w-0",
        isEmbedded
          ? "border-0 shadow-none bg-transparent rounded-none"
          : "rounded-[32px] border-none shadow-lg shadow-zinc-200/50 bg-white",
        className,
      )}
    >
      <CardHeader
        className={cn("pb-0", isEmbedded ? "px-0 pt-0" : "md:px-8 md:pt-8")}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900">
              Financial Overview
            </CardTitle>
            <CardDescription className="text-base text-zinc-500 font-medium">
              Revenue, expenses, and net income
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px] rounded-2xl h-11 border-zinc-200 bg-zinc-50 font-medium">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="weekly">Last 7 Days</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="yearly">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl h-11 w-11 border-zinc-200"
                >
                  <Eye className="h-4 w-4 text-zinc-500" />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full! max-w-7xl! max-h-[90vh]! flex flex-col p-0 gap-0 overflow-hidden rounded-[24px]">
                <DialogHeader className="p-6 pb-4 border-b border-zinc-100">
                  <DialogTitle>Financial Details</DialogTitle>
                </DialogHeader>
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                        <div className="text-xs uppercase font-bold text-emerald-600 tracking-wider">
                          Gross Revenue
                        </div>
                        <div className="text-2xl font-bold text-emerald-900 mt-1">
                          ₱{totalRevenue.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
                        <div className="text-xs uppercase font-bold text-red-600 tracking-wider">
                          Payroll Expenses
                        </div>
                        <div className="text-2xl font-bold text-red-900 mt-1">
                          ₱{totalPayroll.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                        <div className="text-xs uppercase font-bold text-blue-600 tracking-wider">
                          Net Revenue
                        </div>
                        <div className="text-2xl font-bold text-blue-900 mt-1">
                          ₱{netRevenue.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-zinc-50/50 p-6 rounded-2xl border border-zinc-100">
                        <h3 className="text-lg font-semibold text-zinc-900 mb-6">
                          Revenue vs Expenses vs Net
                        </h3>
                        <div className="h-[400px] w-full min-w-0 min-h-[320px]">
                          <ResponsiveContainer
                            width="100%"
                            height="100%"
                            minWidth={0}
                            minHeight={320}
                          >
                            <BarChart
                              data={data}
                              margin={{
                                top: 20,
                                right: 20,
                                left: 0,
                                bottom: 0,
                              }}
                              barGap={2}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#e4e4e7"
                              />
                              <XAxis
                                dataKey="name"
                                stroke="#71717a"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                              />
                              <YAxis
                                stroke="#71717a"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) =>
                                  `₱${value >= 1000 ? `${value / 1000}k` : value}`
                                }
                              />
                              <Tooltip
                                cursor={{ fill: "#f4f4f5", radius: 4 }}
                                contentStyle={{
                                  borderRadius: "12px",
                                  border: "none",
                                  boxShadow:
                                    "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                                }}
                              />
                              <Legend wrapperStyle={{ paddingTop: "20px" }} />
                              <Bar
                                dataKey="total"
                                name="Gross Revenue"
                                fill="#10b981"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                              />
                              <Bar
                                dataKey="expenses"
                                name="Payroll Expenses"
                                fill="#ef4444"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                              />
                              <Bar
                                dataKey="net"
                                name="Net Revenue"
                                fill="#3b82f6"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="h-full flex flex-col">
                        <h3 className="text-lg font-semibold text-zinc-900 mb-6">
                          Category Breakdown
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 content-start">
                          {Object.entries(categoryBreakdown)
                            .sort(([, a], [, b]) => b - a)
                            .map(([name, val], i) => (
                              <div
                                key={name}
                                className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100/50 h-fit"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-2 h-8 rounded-full"
                                    style={{
                                      backgroundColor:
                                        colors[i % colors.length],
                                    }}
                                  />
                                  <span className="font-medium text-zinc-700">
                                    {name}
                                  </span>
                                </div>
                                <span className="font-bold text-zinc-900">
                                  ₱{val.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          {Object.keys(categoryBreakdown).length === 0 && (
                            <div className="col-span-full py-8 text-center text-zinc-500">
                              No category data available for this period.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
          <div className="space-y-1">
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              Net Revenue
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-emerald-900">
              ₱{netRevenue.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
              Gross: ₱{totalRevenue.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              Expenses (Payroll)
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-red-700">
              ₱{totalPayroll.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-zinc-500">
              {range === "daily"
                ? "Today"
                : range === "monthly"
                  ? "This Month"
                  : range === "weekly"
                    ? "Last 7 Days"
                    : "This Year"}
            </div>
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

      <CardContent
        className={cn(
          "py-6 flex-1 min-h-[300px] min-w-0",
          isEmbedded ? "px-0" : "px-2 md:px-6",
        )}
      >
        {isClient ? (
          <div className="h-full w-full min-h-[240px] min-w-0">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={240}
            >
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
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const tooltipItems = payload as Array<{
                      name?: string;
                      color?: string;
                      value?: number | string;
                    }>;
                    const totalValue = tooltipItems.reduce(
                      (acc, curr) => acc + Number(curr.value ?? 0),
                      0,
                    );
                    return (
                      <div className="rounded-xl border-none bg-zinc-900 p-4 shadow-xl text-white ring-1 ring-white/10 min-w-[150px]">
                        <div className="font-bold text-sm mb-2 text-zinc-300">
                          {label}
                        </div>
                        {tooltipItems.map((p) => (
                          <div
                            key={p.name}
                            className="flex items-center justify-between gap-4 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: p.color }}
                              />
                              <span className="text-zinc-400 capitalize">
                                {p.name}
                              </span>
                            </div>
                            <span className="font-semibold">
                              ₱{Number(p.value ?? 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                        <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center">
                          <span className="text-xs font-bold uppercase text-zinc-400">
                            Total
                          </span>
                          <span className="font-bold text-emerald-400">
                            ₱
                            {totalValue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {categories.length > 0 ? (
                categories.map((cat, i) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="a"
                    fill={colors[i % colors.length]}
                    radius={[0, 0, 0, 0]}
                  />
                ))
              ) : (
                <Bar
                  dataKey="total"
                  fill="#10b981"
                  radius={[6, 6, 6, 6]}
                  barSize={range === "daily" ? 24 : 40}
                />
              )}
            </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
            Loading chart...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
