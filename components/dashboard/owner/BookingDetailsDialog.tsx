import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatPH } from "@/lib/date-utils";
import {
  Booking,
  Customer,
  AvailedService,
  Service,
  Employee,
  BookingStatus,
  User,
} from "@/prisma/generated/prisma/client";
import {
  Calendar,
  Clock,
  User as UserIcon,
  Phone,
  Mail,
  Receipt,
} from "lucide-react";

type BookingWithDetails = Booking & {
  customer: Customer;
  availed_services: (AvailedService & {
    service: Service;
    served_by: (Employee & { user: User }) | null;
  })[];
};

interface BookingDetailsDialogProps {
  booking: BookingWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookingDetailsDialog({
  booking,
  open,
  onOpenChange,
}: BookingDetailsDialogProps) {
  if (!booking) return null;

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const balance = booking.grand_total - (booking.downpayment || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Booking #{booking.id}</DialogTitle>
            <Badge variant="outline" className={getStatusColor(booking.status)}>
              {booking.status}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4" />
            {formatPH(booking.created_at, "MMMM d, yyyy")}
            <span className="text-zinc-300">|</span>
            <Clock className="h-4 w-4" />
            {formatPH(booking.created_at, "h:mm a")}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 pt-2">
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-muted/30 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <UserIcon className="h-4 w-4" /> Customer Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground block">
                    Name
                  </span>
                  <span className="font-medium">{booking.customer.name}</span>
                </div>
                {booking.customer.phone && (
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Phone
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{booking.customer.phone}</span>
                    </div>
                  </div>
                )}
                {booking.customer.email && (
                  <div className="sm:col-span-2">
                    <span className="text-xs text-muted-foreground block">
                      Email
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span>{booking.customer.email}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Services */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Services
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">
                        Service
                      </th>
                      <th className="px-4 py-2 text-left font-medium">Staff</th>
                      <th className="px-4 py-2 text-right font-medium">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {booking.availed_services.map((as) => (
                      <tr key={as.id} className="divide-x-0">
                        <td className="px-4 py-3">
                          <div className="font-medium">{as.service.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPH(as.scheduled_at, "h:mm a")}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {as.served_by ? (
                            as.served_by.user.name
                          ) : (
                            <span className="text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded text-xs">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          ₱{as.price.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="flex justify-end">
              <div className="w-full sm:w-1/2 space-y-2 bg-zinc-50 p-4 rounded-lg border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₱{booking.grand_total.toLocaleString()}</span>
                </div>
                {booking.downpayment && booking.downpayment > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Downpayment</span>
                    <span>-₱{booking.downpayment.toLocaleString()}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Due</span>
                  <span>
                    ₱
                    {balance > 0 &&
                    booking.status !== "COMPLETED" &&
                    booking.payment_method !== "CASH"
                      ? balance.toLocaleString()
                      : booking.grand_total.toLocaleString()}
                  </span>
                </div>
                {balance > 0 &&
                  booking.status !== "COMPLETED" &&
                  booking.payment_method !== "CASH" && (
                    <div className="text-right text-xs text-orange-600 font-medium">
                      (Balance Remaining)
                    </div>
                  )}
                {(booking.status === "COMPLETED" ||
                  booking.payment_method === "CASH") && (
                  <div className="text-right text-xs text-green-600 font-medium">
                    (Paid)
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
