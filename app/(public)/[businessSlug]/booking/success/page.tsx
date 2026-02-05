import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Metadata } from "next";

import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Booking Confirmed | Service Flow",
  description: "Your booking is confirmed. Thank you for choosing Service Flow.",
  robots: {
    index: false,
    follow: false,
  },
};

async function BookingSuccessContent({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

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
      </div>
    </div>
  );
}

export default async function BookingSuccessPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <BookingSuccessContent params={params} />
      </Suspense>
    </div>
  );
}
