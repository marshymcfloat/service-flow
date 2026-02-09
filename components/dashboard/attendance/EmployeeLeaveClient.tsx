"use client";

import { LeaveRequest } from "@/prisma/generated/prisma/client";
import { RequestLeaveDialog } from "./RequestLeaveDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cancelLeaveRequest } from "@/app/actions/leave-request";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface EmployeeLeaveClientProps {
  employeeId: number;
  businessId: string;
  businessSlug: string; // Added prop
  requests: LeaveRequest[];
}

export function EmployeeLeaveClient({
  employeeId,
  businessId,
  businessSlug,
  requests,
}: EmployeeLeaveClientProps) {
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-500 hover:bg-green-600";
      case "REJECTED":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-yellow-500 hover:bg-yellow-600";
    }
  };

  const handleCancel = async (id: number) => {
    try {
      setCancellingId(id);
      const result = await cancelLeaveRequest(id);
      if (result.success) {
        toast.success("Leave request cancelled");
      } else {
        toast.error(result.error || "Failed to cancel request");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full md:w-auto">
          Manage Leave Requests
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] md:max-w-5xl!  h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Leave Requests</DialogTitle>
          <DialogDescription>
            Manage your leave requests and view their status.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
          <div className="flex justify-end">
            <RequestLeaveDialog
              employeeId={employeeId}
              businessId={businessId}
              businessSlug={businessSlug}
            />
          </div>

          <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
              <CardTitle>My Requests</CardTitle>
              <CardDescription>History of your leave requests.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {requests.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border rounded-lg border-dashed">
                  No leave requests found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dates</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Admin Comment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>
                              {format(
                                new Date(request.start_date),
                                "MMM d, yyyy",
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              to{" "}
                              {format(
                                new Date(request.end_date),
                                "MMM d, yyyy",
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.type}</Badge>
                        </TableCell>
                        <TableCell
                          className="max-w-[200px] truncate"
                          title={request.reason}
                        >
                          {request.reason}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getStatusColor(request.status)}
                            variant="secondary"
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {request.admin_comment || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === "PENDING" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  disabled={cancellingId === request.id}
                                >
                                  {cancellingId === request.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Cancel"
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Cancel Leave Request
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this leave
                                    request? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Keep Request
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleCancel(request.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Yes, Cancel Request
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
