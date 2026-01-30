"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
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
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface PayslipGenerationDialogProps {
  employeeId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PayslipGenerationDialog({
  employeeId,
  open,
  onOpenChange,
  onSuccess,
}: PayslipGenerationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<any>(null);
  const [deduction, setDeduction] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (open && employeeId) {
      fetchData();
      setDeduction(0);
      setComment("");
    } else {
      setData(null);
    }
  }, [open, employeeId]);

  const fetchData = async () => {
    if (!employeeId) return;
    setLoading(true);
    const res = await getPayslipDataAction(employeeId);
    setLoading(false);
    if (res.success) {
      setData(res.data);
    } else {
      toast.error(res.error);
      onOpenChange(false);
    }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto md:max-w-[600px]!">
        <DialogHeader>
          <DialogTitle>Generate Payslip</DialogTitle>
          <DialogDescription>
            Review the calculated salary details before generating.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="text-sm bg-muted/50 p-3 rounded-md space-y-1">
              <div className="flex justify-between font-medium">
                <span>Employee</span>
                <span>{data.employee.name}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Period Start</span>
                <span>{formatPH(data.period.start, "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Period End</span>
                <span>{formatPH(data.period.end, "MMM d, yyyy")}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Daily Rate</span>
                <span>₱{data.employee.daily_rate.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Days Present</span>
                <span>x {data.breakdown.days_present}</span>
              </div>
              <div className="flex justify-between font-medium text-zinc-700">
                <span>Basic Pay</span>
                <span>₱{data.breakdown.basic_salary.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Commission ({data.employee.commission_percentage}%)</span>
                <span>{data.breakdown.commission_services_count} services</span>
              </div>
              <div className="flex justify-between font-medium text-zinc-700">
                <span>Commission Pay</span>
                <span>₱{data.breakdown.commission_total.toLocaleString()}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-center">
              <Calendar
                mode="multiple"
                month={new Date(data.period.end)}
                selected={data.breakdown.attendance_dates.map(
                  (d: string) => new Date(d),
                )}
                modifiers={{
                  present: data.breakdown.attendance_dates.map(
                    (d: string) => new Date(d),
                  ),
                }}
                modifiersClassNames={{
                  present:
                    "bg-primary text-primary-foreground rounded-full font-medium",
                }}
                disabled={(date) =>
                  date < new Date(data.period.start) ||
                  date > new Date(data.period.end)
                }
                className="rounded-md border shadow-sm"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="deduction">Deduction</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">
                    ₱
                  </span>
                  <Input
                    id="deduction"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    className="pl-7"
                    value={deduction || ""}
                    onChange={(e) => setDeduction(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  placeholder="Optional notes..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex justify-between font-bold text-lg">
              <span>Total Payout</span>
              <span>₱{(data.total_salary - deduction).toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={generating}
              >
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Pay & Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Failed to load data
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
