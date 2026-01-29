import React from "react";
import { LucideIcon, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  count: number | string;
  description: string;
  Icon?: LucideIcon;
  variant?: "filled" | "light";
}

export default function DashboardCard({
  title,
  count,
  description,
  variant = "light",
  Icon,
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        "min-w-[300px] p-6 rounded-[30px] flex flex-col justify-between h-[180px] transition-all duration-300 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)]",
        variant === "filled"
          ? "bg-gradient-to-br from-emerald-800 to-emerald-950 text-white shadow-[0_20px_40px_-12px_rgba(6,95,70,0.3)]"
          : "bg-white text-zinc-900 border border-zinc-50 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)]",
      )}
    >
      <div className="flex justify-between items-start w-full">
        <h3
          className={cn(
            "font-medium text-lg leading-tight",
            variant === "filled" ? "text-emerald-50" : "text-zinc-700",
          )}
        >
          {title}
        </h3>
        <div
          className={cn(
            "size-10 rounded-full flex items-center justify-center transition-transform hover:-translate-y-1 hover:translate-x-1",
            variant === "filled"
              ? "bg-white/10 text-white backdrop-blur-sm"
              : "border border-zinc-200 text-zinc-900 bg-white",
          )}
        >
          {Icon ? <Icon size={20} /> : <ArrowUpRight size={20} />}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-5xl font-semibold tracking-tight">
          {typeof count === "number" ? count.toLocaleString() : count}
        </div>
        <div
          className={cn(
            "flex items-center gap-2 text-sm font-medium",
            variant === "filled" ? "text-emerald-200" : "text-emerald-600",
          )}
        >
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs",
              variant === "filled"
                ? "bg-emerald-500/20 text-emerald-100"
                : "bg-emerald-100 text-emerald-700",
            )}
          >
            <ArrowUpRight size={12} />
            5%
          </span>
          <span
            className={cn(
              variant === "filled" ? "text-emerald-200/80" : "text-zinc-500",
            )}
          >
            {description}
          </span>
        </div>
      </div>
    </div>
  );
}
