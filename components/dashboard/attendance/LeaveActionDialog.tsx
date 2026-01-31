"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { updateLeaveRequestStatus } from "@/app/actions/leave-request";
import { toast } from "sonner";
import { LeaveRequestStatus } from "@/prisma/generated/prisma/client";

const formSchema = z.object({
  comment: z.string().optional(),
});

interface LeaveActionDialogProps {
  requestId: number;
  action: "APPROVE" | "REJECT";
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function LeaveActionDialog({
  requestId,
  action,
  trigger,
  onSuccess,
}: LeaveActionDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      comment: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const status: LeaveRequestStatus =
        action === "APPROVE" ? "APPROVED" : "REJECTED";

      const result = await updateLeaveRequestStatus(
        requestId,
        status,
        values.comment,
      );

      if (result.success) {
        toast.success(`Leave request ${action.toLowerCase()}d`);
        setOpen(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(
          result.error || `Failed to ${action.toLowerCase()} request`,
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    }
  };

  const title =
    action === "APPROVE" ? "Approve Leave Request" : "Reject Leave Request";
  const description =
    action === "APPROVE"
      ? "Are you sure you want to approve this leave request? This will automatically create attendance records."
      : "Are you sure you want to reject this leave request?";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant={action === "APPROVE" ? "default" : "destructive"}>
            {title}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admin Comment (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a note..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="submit"
                variant={action === "APPROVE" ? "default" : "destructive"}
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirm {action === "APPROVE" ? "Approval" : "Rejection"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
