"use client";

import {
  LeaveRequest,
  Employee,
  User,
  LeaveRequestStatus,
} from "@/prisma/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeaveActionDialog } from "./LeaveActionDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LeaveRequestWithEmployee = LeaveRequest & {
  employee: Employee & {
    user: User;
  };
};

interface LeaveRequestsTabProps {
  requests: LeaveRequestWithEmployee[];
  params: { businessSlug: string };
}

export function LeaveRequestsTab({ requests }: LeaveRequestsTabProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave Requests</CardTitle>
        <CardDescription>Manage employee leave requests.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Admin Comment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No leave requests found.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.employee.user.name}
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.start_date), "MMM dd")} -{" "}
                    {format(new Date(request.end_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>{request.reason}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{request.admin_comment || "-"}</TableCell>
                  <TableCell className="text-right">
                    {request.status === "PENDING" && (
                      <div className="flex justify-end gap-2">
                        <LeaveActionDialog
                          requestId={request.id}
                          action="REJECT"
                          trigger={
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive hover:bg-destructive/10"
                            >
                              Reject
                            </Button>
                          }
                        />
                        <LeaveActionDialog
                          requestId={request.id}
                          action="APPROVE"
                          trigger={<Button size="sm">Approve</Button>}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
