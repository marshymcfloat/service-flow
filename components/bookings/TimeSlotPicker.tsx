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
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-1">
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
              "h-auto py-2 px-3 flex flex-col items-center gap-1",
              !slot.available && "opacity-50 cursor-not-allowed",
              isSelected && "ring-2 ring-primary ring-offset-2",
              availabilityLevel === "high" &&
                !isSelected &&
                "border-green-500/50 hover:border-green-500",
              availabilityLevel === "medium" &&
                !isSelected &&
                "border-yellow-500/50 hover:border-yellow-500",
            )}
          >
            <span className="font-semibold text-sm">
              {format(slot.startTime, "h:mm a")}
            </span>
            <span
              className={cn(
                "text-xs flex items-center gap-1",
                isSelected
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground",
              )}
            >
              <Users className="h-3 w-3" />
              {slot.availableEmployeeCount}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
