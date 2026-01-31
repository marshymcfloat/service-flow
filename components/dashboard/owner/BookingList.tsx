"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Booking,
  Customer,
  BookingStatus,
  AvailedService,
  Service,
  Employee,
  User,
} from "@/prisma/generated/prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatPH } from "@/lib/date-utils";
import { Search, Check, X, Trash2, RefreshCcw } from "lucide-react";
import {
  deleteBookingAction,
  updateBookingStatusAction,
} from "@/lib/server actions/dashboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { BookingDetailsDialog } from "./BookingDetailsDialog";

type BookingWithDetails = Booking & {
  customer: Customer;
  availed_services: (AvailedService & {
    service: Service;
    served_by: (Employee & { user: User }) | null;
  })[];
};

export function BookingList({ bookings }: { bookings: BookingWithDetails[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedBooking, setSelectedBooking] =
    useState<BookingWithDetails | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // Search Logic
      const searchLower = search.toLowerCase();
      const matchesSearch =
        booking.customer.name.toLowerCase().includes(searchLower) ||
        booking.id.toString().includes(searchLower) ||
        (booking.customer.phone &&
          booking.customer.phone.includes(searchLower));

      // Status Logic
      const matchesStatus =
        statusFilter === "ALL" || booking.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100/80";
      case "COMPLETED":
        return "bg-green-100 text-green-800 hover:bg-green-100/80";
      case "CANCELLED":
        return "bg-red-100 text-red-800 hover:bg-red-100/80";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100/80";
    }
  };

  const handleStatusUpdate = async (id: number, status: BookingStatus) => {
    const res = await updateBookingStatusAction(id, status);
    if (res.success) {
      toast.success(`Booking ${status.toLowerCase()} successfully`);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await deleteBookingAction(id);
    if (res.success) {
      toast.success("Booking deleted successfully");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <>
      <Card className="h-full  shadow-sm border-zinc-100 flex flex-col overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold">Bookings</CardTitle>
              <CardDescription>Manage and view all bookings</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2"
              onClick={() => router.refresh()}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Refresh
              </span>
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer or ID..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0 border-t min-h-[350px]">
          <Table>
            <TableHeader className="bg-zinc-50/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <TableRow
                    key={booking.id}
                    className="hover:bg-zinc-50/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setIsDialogOpen(true);
                    }}
                  >
                    <TableCell className="font-medium">#{booking.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {booking.customer.name}
                        </span>
                        {booking.customer.phone && (
                          <span className="text-xs text-muted-foreground">
                            {booking.customer.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatPH(booking.created_at, "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={getStatusColor(booking.status)}
                        >
                          {booking.status.replace("_", " ")}
                        </Badge>
                        {booking.status === "ACCEPTED" &&
                          (booking.downpayment || 0) > 0 &&
                          booking.grand_total > (booking.downpayment || 0) && (
                            <Badge
                              variant="outline"
                              className="border-orange-200 text-orange-700 bg-orange-50 text-[10px] px-1.5 h-5"
                            >
                              Bal: ₱
                              {(
                                booking.grand_total - (booking.downpayment || 0)
                              ).toLocaleString()}
                            </Badge>
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₱{booking.grand_total.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {booking.status === "ACCEPTED" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(booking.id, "CANCELLED");
                            }}
                            title="Cancel Booking"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the booking.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => handleDelete(booking.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No bookings found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BookingDetailsDialog
        booking={selectedBooking}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
