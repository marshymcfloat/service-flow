import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CalendarPlus } from "lucide-react";
import { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/prisma/prisma";

type BookingSuccessSearchParams = {
  bookingId?: string | string[];
};

const formatIcsDate = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

const escapeIcsText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

export const metadata: Metadata = {
  title: "Booking Confirmed | Service Flow",
  description:
    "Your booking is confirmed. Thank you for choosing Service Flow.",
  robots: {
    index: false,
    follow: false,
  },
};

async function BookingSuccessContent({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams?: BookingSuccessSearchParams;
}) {
  const { businessSlug } = await params;
  const bookingIdParam = Array.isArray(searchParams?.bookingId)
    ? searchParams?.bookingId[0]
    : searchParams?.bookingId;
  const bookingId = bookingIdParam ? Number(bookingIdParam) : null;

  const booking =
    bookingId && Number.isFinite(bookingId)
      ? await prisma.booking.findFirst({
          where: {
            id: bookingId,
            business: { slug: businessSlug },
          },
          select: {
            id: true,
            scheduled_at: true,
            estimated_end: true,
            business: { select: { name: true } },
            availed_services: {
              select: { service: { select: { name: true } } },
            },
          },
        })
      : null;

  const scheduledAt = booking?.scheduled_at ?? null;
  const estimatedEnd =
    booking?.estimated_end ??
    (scheduledAt ? new Date(scheduledAt.getTime() + 60 * 60 * 1000) : null);
  const serviceNames =
    booking?.availed_services
      ?.map((item) => item.service?.name)
      .filter(Boolean) ?? [];
  const businessName = booking?.business?.name || "Service Flow";

  const calendarHref =
    booking && scheduledAt && estimatedEnd
      ? (() => {
          const servicesLabel =
            serviceNames.length > 0 ? serviceNames.join(", ") : "Appointment";
          const summary = `${servicesLabel} at ${businessName}`;
          const description =
            serviceNames.length > 0
              ? `Services: ${serviceNames.join(", ")}`
              : "Service appointment";

          const icsContent = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Service Flow//Booking//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            `UID:booking-${booking.id}@serviceflow`,
            `DTSTAMP:${formatIcsDate(new Date())}`,
            `DTSTART:${formatIcsDate(scheduledAt)}`,
            `DTEND:${formatIcsDate(estimatedEnd)}`,
            `SUMMARY:${escapeIcsText(summary)}`,
            `DESCRIPTION:${escapeIcsText(description)}`,
            "END:VEVENT",
            "END:VCALENDAR",
          ].join("\n");

          return `data:text/calendar;charset=utf-8,${encodeURIComponent(
            icsContent,
          )}`;
        })()
      : null;

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500 animate-in zoom-in duration-300" />
        <div className="absolute h-full w-full animate-ping rounded-full bg-green-400 opacity-20 duration-1000" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Booking Confirmed!
        </h1>
        <p className="text-muted-foreground">
          Thank you for your reservation. We have received your payment and your
          booking is confirmed.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Button asChild className="w-full bg-violet-600 hover:bg-violet-700">
          <Link href={`/${businessSlug}/booking`}>Book Another Service</Link>
        </Button>
        {calendarHref ? (
          <Button asChild variant="outline" className="w-full">
            <a href={calendarHref}>
              <CalendarPlus className="h-4 w-4" /> Add reminder to calendar
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default async function BookingSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams?: BookingSuccessSearchParams;
}) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <BookingSuccessContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
