"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, RefreshCcw } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-red-50/40 via-background to-background" />
      <div className="absolute top-0 right-0 -z-10 w-1/2 h-1/2 bg-linear-to-bl from-red-100/20 to-transparent blur-3xl opacity-50" />

      <div className="space-y-8 max-w-md mx-auto relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="space-y-4">
          <div className="mx-auto size-24 bg-red-50 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-red-100/50">
            <AlertCircle className="size-10 text-red-500" />
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Something went wrong
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            We apologize for the inconvenience. Our team has been notified of
            this issue.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button
            onClick={() => reset()}
            size="lg"
            className="rounded-full shadow-lg shadow-red-200/50 hover:shadow-red-300/50 transition-all hover:scale-105 bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            <RefreshCcw className="size-4" />
            Try Again
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-full border-border/60 hover:bg-muted/50 gap-2 transition-all hover:scale-105"
          >
            <Link href="/">
              <Home className="size-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
