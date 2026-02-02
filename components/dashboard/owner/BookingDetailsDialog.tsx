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
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "CANCELLED":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  const balance = booking.grand_total - (booking.downpayment || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl md:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white border-none shadow-2xl rounded-3xl">
        <DialogHeader className="p-6 pb-4 bg-zinc-50/50 border-b border-zinc-100 flex flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                Booking Details
                <span className="text-zinc-400 font-medium text-lg">
                  #{booking.id}
                </span>
              </DialogTitle>
              <div className="text-sm text-zinc-500 font-medium flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                {formatPH(booking.created_at, "MMMM d, yyyy")}
                <span className="text-zinc-300 mx-1">|</span>
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                {formatPH(booking.created_at, "h:mm a")}
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border",
                getStatusColor(booking.status),
              )}
            >
              {booking.status}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            {/* Customer Section */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5" /> Customer Information
              </h3>
              <div className="bg-zinc-50/80 p-4 rounded-xl border border-zinc-100/80">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                  <div>
                    <span className="text-[10px] uppercase text-zinc-400 font-semibold tracking-wide block mb-1">
                      Full Name
                    </span>
                    <span className="text-sm font-semibold text-zinc-900">
                      {booking.customer.name}
                    </span>
                  </div>
                  {booking.customer.phone && (
                    <div>
                      <span className="text-[10px] uppercase text-zinc-400 font-semibold tracking-wide block mb-1">
                        Phone Number
                      </span>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-700">
                          {booking.customer.phone}
                        </span>
                      </div>
                    </div>
                  )}
                  {booking.customer.email && (
                    <div className="sm:col-span-2">
                      <span className="text-[10px] uppercase text-zinc-400 font-semibold tracking-wide block mb-1">
                        Email Address
                      </span>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-700">
                          {booking.customer.email}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <Separator className="bg-zinc-100" />

            {/* Services Section */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5" /> Services & Pricing
              </h3>
              <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50/80 text-zinc-500 border-b border-zinc-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                        Staff
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 bg-white">
                    {booking.availed_services.map((as) => (
                      <tr
                        key={as.id}
                        className="hover:bg-zinc-50/50 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-zinc-900">
                            {as.service.name}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {as.served_by ? (
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                                {as.served_by.user.name.charAt(0)}
                              </div>
                              <span className="text-zinc-700 font-medium">
                                {as.served_by.user.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-xs font-medium border border-amber-100">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-zinc-700">
                          ₱{as.price.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Payment Summary */}
            <section className="flex justify-end pt-2">
              <div className="w-full sm:w-2/3 md:w-1/2 bg-zinc-50/50 rounded-xl border border-zinc-100 p-5 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-medium">Subtotal</span>
                  <span className="font-semibold text-zinc-900">
                    ₱{booking.grand_total.toLocaleString()}
                  </span>
                </div>
                {booking.downpayment && booking.downpayment > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-emerald-600 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Downpayment
                    </span>
                    <span className="font-semibold text-emerald-700">
                      -₱{booking.downpayment.toLocaleString()}
                    </span>
                  </div>
                )}
                <Separator className="bg-zinc-200 my-2" />
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-zinc-900">
                      Total Due
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      {booking.status === "COMPLETED" ||
                      booking.payment_method === "CASH"
                        ? "Paid in full"
                        : "Remaining balance"}
                    </span>
                  </div>
                  <span className="text-xl font-bold text-zinc-900 tracking-tight">
                    ₱
                    {balance > 0 &&
                    booking.status !== "COMPLETED" &&
                    booking.payment_method !== "CASH"
                      ? balance.toLocaleString()
                      : booking.grand_total.toLocaleString()}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
