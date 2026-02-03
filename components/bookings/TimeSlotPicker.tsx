"use client";

import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TimeSlot } from "@/lib/server actions/availability";
import { Clock, Users } from "lucide-react";

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  value?: Date;
  onChange: (time: Date) => void;
  isLoading?: boolean;
}

export default function TimeSlotPicker({
  slots,
  value,
  onChange,
  isLoading = false,
}: TimeSlotPickerProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No available slots for this date</p>
        <p className="text-sm">Try selecting a different day</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto p-1">
      {slots.map((slot) => {
        const isSelected =
          value && slot.startTime.getTime() === value.getTime();
        const availabilityLevel =
          slot.availableEmployeeCount >= 3
            ? "high"
            : slot.availableEmployeeCount >= 1
              ? "medium"
              : "none";

        return (
          <Button
            key={slot.startTime.toISOString()}
            type="button"
            variant={isSelected ? "default" : "outline"}
            disabled={!slot.available}
            onClick={() => onChange(slot.startTime)}
            className={cn(
              "h-auto py-3 px-2 flex flex-col items-center gap-1.5 transition-all duration-200",
              !slot.available && "opacity-40 cursor-not-allowed bg-muted/50",
              isSelected
                ? "shadow-md ring-2 ring-primary/20 ring-offset-1 scale-[1.02]"
                : "hover:border-primary/50 hover:bg-primary/5 bg-card",
              availabilityLevel === "high" &&
                !isSelected &&
                "border-green-500/30 hover:border-green-500/60 hover:bg-green-50/10",
            )}
          >
            <span
              className={cn(
                "font-bold text-sm tracking-tight",
                isSelected ? "text-primary-foreground" : "text-foreground",
              )}
            >
              {new Date(slot.startTime).toLocaleTimeString("en-US", {
                timeZone: "Asia/Manila",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider font-medium flex items-center gap-1",
                isSelected
                  ? "text-primary-foreground/80"
                  : availabilityLevel === "high"
                    ? "text-green-600"
                    : "text-muted-foreground",
              )}
            >
              {slot.availableEmployeeCount}{" "}
              {slot.availableEmployeeCount === 1 ? "Staff" : "Staffs"}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
