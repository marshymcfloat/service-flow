"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import {
  createPayslipAction,
  getPayslipDataAction,
} from "@/lib/server actions/payslip";
import { toast } from "sonner";
import { formatPH } from "@/lib/date-utils";
import {
  Loader2,
  Wallet,
  Calendar as CalendarIcon,
  AlertCircle,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface PayslipGenerationDialogProps {
  employeeId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type PayslipData = {
  employee: {
    id: number;
    name: string;
    daily_rate: number;
    commission_percentage: number;
  };
  period: {
    start: Date;
    end: Date;
  };
  breakdown: {
    days_present: number;
    paid_leave_days: number;
    attendance_dates: Date[];
    basic_salary: number;
    commission_services_count: number;
    commission_services: Array<{
      id: number;
      commission_base: number | null;
      price: number;
      package: { name: string } | null;
      service: { name: string };
    }>;
    commission_total: number;
  };
  total_salary: number;
};
type CommissionService = PayslipData["breakdown"]["commission_services"][number];

export function PayslipGenerationDialog({
  employeeId,
  open,
  onOpenChange,
  onSuccess,
}: PayslipGenerationDialogProps) {
  const [generating, setGenerating] = useState(false);
  const [deduction, setDeduction] = useState(0);
  const [comment, setComment] = useState("");

  const { data, isLoading, isFetching, error } = useQuery<PayslipData, Error>({
    queryKey: ["payslip-data", employeeId],
    enabled: open && !!employeeId,
    queryFn: async (): Promise<PayslipData> => {
      if (!employeeId) {
        throw new Error("Employee not found");
      }

      const res = await getPayslipDataAction(employeeId);
      if (!res.success || !("data" in res) || !res.data) {
        throw new Error(("error" in res && res.error) || "Failed to load data");
      }

      return res.data;
    },
  });

  useEffect(() => {
    if (!error) return;
    toast.error(error.message);
    onOpenChange(false);
  }, [error, onOpenChange]);

  const loading = isLoading || isFetching;

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDeduction(0);
      setComment("");
    }
    onOpenChange(nextOpen);
  };

  const handleGenerate = async () => {
    if (!data) return;
    setGenerating(true);
    const res = await createPayslipAction({
      employeeId: data.employee.id,
      startingDate: data.period.start,
      endingDate: data.period.end,
      daysPresent: data.breakdown.days_present,
      totalSalary: data.total_salary - deduction,
      deduction: deduction,
      comment: comment,
    });
    setGenerating(false);

    if (res.success) {
      toast.success("Payslip generated successfully");
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(res.error);
    }
  };

  if (!employeeId) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px]! max-h-[90vh] flex flex-col p-0 gap-0 bg-zinc-50 overflow-hidden">
        <DialogHeader className="p-6 pb-2 bg-white border-b border-zinc-100 shrink-0">
          <DialogTitle className="text-xl font-bold text-zinc-900">
            Generate Payslip
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Review salary details and confirm payout generation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin mb-2 text-emerald-500" />
              <p className="text-sm">Calculating payout details...</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-50">
                  <span className="text-sm text-zinc-500">Employee</span>
                  <span className="font-semibold text-zinc-900">
                    {data.employee.name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-zinc-400 uppercase font-medium block mb-1">
                      Period Start
                    </span>
                    <div className="flex items-center gap-2 text-sm text-zinc-700 bg-zinc-50 px-2 py-1.5 rounded-md border border-zinc-100">
                      <CalendarIcon className="h-3.5 w-3.5 text-zinc-400" />
                      {formatPH(data.period.start, "PPP p")}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 uppercase font-medium block mb-1">
                      Period End
                    </span>
                    <div className="flex items-center gap-2 text-sm text-zinc-700 bg-zinc-50 px-2 py-1.5 rounded-md border border-zinc-100">
                      <CalendarIcon className="h-3.5 w-3.5 text-zinc-400" />
                      {formatPH(data.period.end, "PPP p")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm space-y-4">
                <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-500" />
                  Salary Breakdown
                </h4>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Daily Rate</span>
                    <span className="font-mono text-zinc-700">
                      ₱{data.employee.daily_rate.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Days Present</span>
                    <span className="font-mono text-zinc-700">
                      x {data.breakdown.days_present}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                    <span className="text-sm font-medium text-zinc-700">
                      Basic Pay
                    </span>
                    <span className="font-bold text-zinc-900">
                      ₱{data.breakdown.basic_salary.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Separator className="bg-zinc-100" />

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-zinc-700">
                      Commission ({data.employee.commission_percentage}%)
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal text-zinc-500 bg-white"
                    >
                      {data.breakdown.commission_services_count} services
                    </Badge>
                  </div>

                  <div className="bg-zinc-50 rounded-lg border border-zinc-100 max-h-[120px] overflow-y-auto">
                    {data.breakdown.commission_services.length > 0 ? (
                      <div className="divide-y divide-zinc-100">
                        {data.breakdown.commission_services.map(
                          (service: CommissionService) => (
                            <div
                              key={service.id}
                              className="px-3 py-2 flex justify-between items-center text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-700 truncate max-w-[140px]">
                                  {service.service.name}
                                </span>
                                {service.package && (
                                  <span className="bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded text-[9px] font-medium border border-indigo-100">
                                    PKG
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-zinc-500">
                                ₱
                                {(
                                  service.commission_base ?? service.price
                                ).toLocaleString()}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-zinc-400 italic">
                        No commission services this period
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50">
                    <span className="text-sm font-medium text-emerald-900">
                      Commission Pay
                    </span>
                    <span className="font-bold text-emerald-700">
                      ₱{data.breakdown.commission_total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="deduction"
                      className="text-xs uppercase text-zinc-500 font-bold"
                    >
                      Deduction / Adjustment
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-zinc-400 font-mono">
                        ₱
                      </span>
                      <Input
                        id="deduction"
                        type="number"
                        min="0"
                        placeholder="0.00"
                        className="pl-7 bg-zinc-50 border-zinc-200 focus-visible:ring-emerald-500"
                        value={deduction || ""}
                        onChange={(e) => setDeduction(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="comment"
                      className="text-xs uppercase text-zinc-500 font-bold"
                    >
                      Notes
                    </Label>
                    <Textarea
                      id="comment"
                      placeholder="Add any notes about this payslip..."
                      className="bg-zinc-50 border-zinc-200 focus-visible:ring-emerald-500 min-h-[60px] resize-none"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="bg-red-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-zinc-900 font-medium">Failed to load data</p>
              <p className="text-zinc-500 text-sm">
                Please try again later or contact support.
              </p>
            </div>
          )}
        </div>

        {data && (
          <div className="p-4 bg-white border-t border-zinc-100 shrink-0">
            <div className="flex justify-between items-center mb-4 px-2">
              <span className="text-sm font-medium text-zinc-500">Net Pay</span>
              <span className="text-2xl font-bold text-zinc-900 tracking-tight">
                ₱{(data.total_salary - deduction).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={generating}
                className="border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200"
              >
                {generating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirm Payout
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
