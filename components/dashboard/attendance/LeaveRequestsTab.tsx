"use client";

import {
  LeaveRequest,
  Employee,
  User,
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
import { User as UserIcon, Calendar, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Helper functions for avatars
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getAvatarColor = (name: string) => {
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

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
    <div className="space-y-6">
      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {requests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-zinc-100">
            <UserIcon className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-zinc-900">
              No requests found
            </h3>
            <p className="text-zinc-500">
              There are no pending leave requests.
            </p>
          </div>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <Avatar
                    className={`${getAvatarColor(request.employee.user.name)} h-10 w-10 text-white shadow-sm ring-2 ring-white`}
                  >
                    <AvatarFallback className="bg-transparent font-medium">
                      {getInitials(request.employee.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold text-zinc-900">
                      {request.employee.user.name}
                    </span>
                    <Badge
                      className={`w-fit mt-1 border-0 ${getStatusColor(request.status)}`}
                    >
                      {request.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-zinc-50">
                <div className="flex items-start gap-2 text-sm text-zinc-600">
                  <Calendar className="h-4 w-4 mt-0.5 text-zinc-400" />
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-400 font-medium uppercase">
                      Dates
                    </span>
                    <span className="font-medium text-zinc-900">
                      {format(new Date(request.start_date), "MMM d, yyyy")} -{" "}
                      {format(new Date(request.end_date), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm text-zinc-600">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-zinc-400" />
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-400 font-medium uppercase">
                      Reason
                    </span>
                    <span>{request.reason}</span>
                  </div>
                </div>
              </div>

              {request.status === "PENDING" && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-50">
                  <LeaveActionDialog
                    requestId={request.id}
                    action="REJECT"
                    trigger={
                      <Button
                        variant="outline"
                        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        Reject
                      </Button>
                    }
                  />
                  <LeaveActionDialog
                    requestId={request.id}
                    action="APPROVE"
                    trigger={
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                        Approve
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-3xl border border-zinc-100 overflow-hidden shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-zinc-50/80 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow className="hover:bg-transparent border-zinc-100">
              <TableHead className="pl-6 h-12 font-semibold text-zinc-500">
                Employee
              </TableHead>
              <TableHead className="h-12 font-semibold text-zinc-500">
                Dates
              </TableHead>
              <TableHead className="h-12 font-semibold text-zinc-500">
                Reason
              </TableHead>
              <TableHead className="h-12 font-semibold text-zinc-500">
                Status
              </TableHead>
              <TableHead className="h-12 font-semibold text-zinc-500">
                Admin Comment
              </TableHead>
              <TableHead className="text-right pr-6 h-12 font-semibold text-zinc-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <UserIcon className="h-8 w-8 text-zinc-300" />
                    <p>No leave requests found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow
                  key={request.id}
                  className="hover:bg-zinc-50/50 transition-colors border-zinc-100"
                >
                  <TableCell className="pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        className={`${getAvatarColor(request.employee.user.name)} h-9 w-9 text-white shadow-sm ring-2 ring-white`}
                      >
                        <AvatarFallback className="bg-transparent font-medium">
                          {getInitials(request.employee.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-zinc-900">
                        {request.employee.user.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col text-sm">
                      <span className="font-medium text-zinc-700">
                        {format(new Date(request.start_date), "MMM d, yyyy")}
                      </span>
                      <span className="text-zinc-400 text-xs">
                        to {format(new Date(request.end_date), "MMM d, yyyy")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 max-w-[200px] truncate text-zinc-600">
                    {request.reason}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge
                      className={`border-0 ${getStatusColor(request.status)}`}
                    >
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 text-zinc-500 text-sm">
                    {request.admin_comment || "-"}
                  </TableCell>
                  <TableCell className="text-right pr-6 py-4">
                    {request.status === "PENDING" && (
                      <div className="flex justify-end gap-2">
                        <LeaveActionDialog
                          requestId={request.id}
                          action="REJECT"
                          trigger={
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              Reject
                            </Button>
                          }
                        />
                        <LeaveActionDialog
                          requestId={request.id}
                          action="APPROVE"
                          trigger={
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Approve
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
