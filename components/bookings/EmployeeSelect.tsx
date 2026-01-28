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

export default function EmployeeSelect({
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
    <div className="space-y-3">
      {availableEmployees.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">
            Available
          </p>
          <div className="flex flex-wrap gap-2">
            {availableEmployees.map((employee) => {
              const isSelected = value === employee.id;
              return (
                <Button
                  key={employee.id}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => onChange(employee.id)}
                  className={cn(
                    "gap-2",
                    isSelected && "ring-2 ring-primary ring-offset-2",
                  )}
                >
                  {isSelected ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  {employee.name}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {unavailableEmployees.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 font-medium">
            Busy at this time
          </p>
          <div className="flex flex-wrap gap-2">
            {unavailableEmployees.map((employee) => (
              <Button
                key={employee.id}
                type="button"
                variant="ghost"
                size="sm"
                disabled
                className="gap-2 opacity-50"
              >
                <User className="h-4 w-4" />
                {employee.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
