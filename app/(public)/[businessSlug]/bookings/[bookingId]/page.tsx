import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { CheckCircle2, XCircle, Calendar, Clock } from "lucide-react";
import { prisma } from "@/prisma/prisma";
import type { Metadata } from "next";
import { verifyBookingSuccessToken } from "@/lib/security/booking-success-token";

export const metadata: Metadata = {
  title: "Booking Details",
  robots: {
    index: false,
    follow: false,
  },
};

interface BookingPageProps {
  params: Promise<{
    businessSlug: string;
    bookingId: string;
  }>;
  searchParams: Promise<{
    token?: string | string[];
  }>;
}

export default async function BookingPage({
  params,
  searchParams,
}: BookingPageProps) {
  const { businessSlug, bookingId } = await params;
  const resolvedSearchParams = await searchParams;
  const id = parseInt(bookingId, 10);

  if (isNaN(id)) {
    return notFound();
  }

  const tokenParam = Array.isArray(resolvedSearchParams?.token)
    ? resolvedSearchParams.token[0]
    : resolvedSearchParams?.token;
  const canViewBooking = Boolean(
    tokenParam &&
    verifyBookingSuccessToken({
      token: tokenParam,
      bookingId: id,
      businessSlug,
      purpose: "details",
    }),
  );

  if (!canViewBooking) {
    return notFound();
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      business: true,
      availed_services: {
        include: {
          service: true,
        },
      },
      customer: true,
    },
  });

  if (!booking || booking.business.slug !== businessSlug) {
    return notFound();
  }

  const statusColor =
    booking.status === "ACCEPTED"
      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
      : booking.status === "CANCELLED"
        ? "bg-red-100 text-red-800 hover:bg-red-100"
        : "bg-gray-100 text-gray-800 hover:bg-gray-100";

  const statusIcon =
    booking.status === "ACCEPTED" ? (
      <CheckCircle2 className="w-5 h-5 mr-1" />
    ) : booking.status === "CANCELLED" ? (
      <XCircle className="w-5 h-5 mr-1" />
    ) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          {/* Business Logo/Avatar could go here if available */}
          <h1 className="text-2xl font-bold text-gray-900">
            {booking.business.name}
          </h1>
          <p className="text-gray-500">Booking Confirmation</p>
        </div>

        <Card className="border-t-4 border-t-emerald-500 shadow-lg">
          <CardHeader className="bg-gray-50/50 pb-4 border-b border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Booking Reference
                </CardTitle>
                <p className="text-2xl font-mono font-bold text-gray-900">
                  #{booking.id}
                </p>
              </div>
              <Badge
                className={`${statusColor} border-0 px-3 py-1 flex items-center`}
              >
                {statusIcon}
                {booking.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Date & Time Highlight */}
            <div className="bg-emerald-50 rounded-xl p-4 flex items-center justify-between border border-emerald-100">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-full text-emerald-600 shadow-sm">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                    Date
                  </p>
                  <p className="font-semibold text-gray-900">
                    {booking.scheduled_at
                      ? format(new Date(booking.scheduled_at), "MMMM d, yyyy")
                      : "TBD"}
                  </p>
                </div>
              </div>
              <div className="w-px h-10 bg-emerald-200 mx-2"></div>
              <div className="flex items-center space-x-3 text-right">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                    Time
                  </p>
                  <p className="font-semibold text-gray-900">
                    {booking.scheduled_at
                      ? format(new Date(booking.scheduled_at), "h:mm a")
                      : "TBD"}
                  </p>
                </div>
                <div className="p-2 bg-white rounded-full text-emerald-600 shadow-sm">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Services List */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Services Booked
              </h3>
              <div className="space-y-3">
                {booking.availed_services.map((availed) => (
                  <div
                    key={availed.id}
                    className="flex justify-between items-center text-sm"
                  >
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2.5"></div>
                      <span className="text-gray-700">
                        {availed.service.name}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      ₱{availed.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Financials */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>₱{booking.grand_total.toFixed(2)}</span>
              </div>

              {booking.total_discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount</span>
                  <span>-₱{booking.total_discount.toFixed(2)}</span>
                </div>
              )}

              <Separator className="my-2" />

              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-900">Total Paid</span>
                <span className="text-xl font-bold text-emerald-600">
                  ₱{booking.grand_total.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50/50 p-6 flex-col space-y-4">
            <div className="text-center w-full">
              <p className="text-xs text-gray-500 mb-4">
                Please arrive 10 minutes before your scheduled time.
              </p>

              {booking.payment_method === "CASH" && (
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium mb-4">
                  Payment: Cash on Arrival
                </div>
              )}
            </div>

            <Button
              asChild
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Link href={`/app/${businessSlug}`}>Book Another Service</Link>
            </Button>

            <Button variant="ghost" className="w-full text-gray-500" asChild>
              <Link href={`/app/${businessSlug}`}>Back to Home</Link>
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center text-xs text-gray-400">
          <p>
            &copy; {new Date().getFullYear()} {booking.business.name}. Powered
            by{" "}
            <span className="font-semibold text-emerald-600">ServiceFlow</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
