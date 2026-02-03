"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, User } from "lucide-react";

interface Employee {
  id: number;
  name: string;
  available: boolean;
}

interface EmployeeSelectProps {
  employees: Employee[];
  value?: number;
  onChange: (employeeId: number) => void;
  isLoading?: boolean;
}

const EmployeeSelect = React.memo(function EmployeeSelect({
  employees,
  value,
  onChange,
  isLoading = false,
}: EmployeeSelectProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-28 rounded-md bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  const availableEmployees = employees.filter((e) => e.available);
  const unavailableEmployees = employees.filter((e) => !e.available);

  if (employees.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No staff members available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {availableEmployees.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">
            Available Staff
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableEmployees.map((employee) => {
              const isSelected = value === employee.id;
              // Generate initials
              const initials = employee.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();

              return (
                <div
                  key={employee.id}
                  onClick={() => onChange(employee.id)}
                  className={cn(
                    "cursor-pointer group relative flex items-center gap-3 p-2 pr-3 rounded-lg border transition-all duration-200",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-primary/50 hover:bg-muted/50",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                    )}
                  >
                    {isSelected ? <Check className="w-4 h-4" /> : initials}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium truncate",
                      isSelected ? "text-primary" : "text-foreground",
                    )}
                  >
                    {employee.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {unavailableEmployees.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">
            Unavailable
          </p>
          <div className="flex flex-wrap gap-2">
            {unavailableEmployees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-dashed border-border bg-muted/30 opacity-60 cursor-not-allowed text-muted-foreground text-xs"
              >
                <User className="h-3 w-3" />
                {employee.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default EmployeeSelect;
