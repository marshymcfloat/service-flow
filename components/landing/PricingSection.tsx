"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Globe } from "lucide-react";
import Link from "next/link";

export default function PricingSection() {
  return (
    <section id="pricing" className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-20 bg-grid-black/[0.02]" />
      <div className="absolute top-0 right-0 -z-10 h-full w-full bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-green-50/40 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 -z-10 h-full w-full bg-[radial-gradient(circle_at_bottom_left,var(--tw-gradient-stops))] from-blue-50/40 via-transparent to-transparent" />

      <div className="container mx-auto px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">Simple, Transparent Pricing</h2>
          <p className="text-lg text-muted-foreground">
            One all-inclusive ServiceFlow plan, available monthly or yearly.
          </p>
        </div>

        <div className="mx-auto max-w-md">
          <div className="group relative overflow-hidden rounded-[2rem] border border-green-100 bg-background p-8 shadow-xl shadow-green-100/20 transition-all duration-300 hover:border-green-300/50 md:p-10 dark:border-green-900/20">
            <div className="pointer-events-none absolute -inset-px rounded-[2rem] bg-gradient-to-l from-green-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="absolute top-0 right-0 rounded-bl-xl border-l border-b border-green-200 bg-green-100 px-4 py-1.5 text-xs font-bold text-green-700">
              ALL-INCLUSIVE
            </div>

            <div className="mb-6">
              <Badge
                variant="secondary"
                className="mb-4 border-none bg-orange-100 text-orange-700 hover:bg-orange-100"
              >
                Admin-Reviewed Onboarding
              </Badge>
              <h3 className="text-2xl font-bold text-foreground">Professional Plan</h3>
              <p className="mt-2 text-muted-foreground">Everything you need to grow.</p>
            </div>

            <div className="mb-2 flex items-baseline gap-1">
              <span className="text-5xl font-extrabold tracking-tight text-foreground">
                PHP 4,000
              </span>
              <span className="font-medium text-muted-foreground">/month</span>
            </div>
            <p className="mb-8 text-sm text-muted-foreground">
              Or PHP 38,400 yearly (20% annual savings)
            </p>

            <div className="mb-8 space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-green-100/50 bg-green-50/50 p-3">
                <div className="shrink-0 rounded-full bg-green-100 p-1.5 text-green-600">
                  <Globe className="size-4" />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-green-900">
                    Free Client-Facing Website
                  </span>
                  <span className="text-xs text-green-700/80">
                    Your own branded booking portal
                  </span>
                </div>
              </div>

              {[
                "Smart Scheduling and Calendar",
                "Staff Attendance and Payroll",
                "Unlimited Bookings",
                "Business Analytics Dashboard",
                "Priority Support",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="shrink-0 rounded-full bg-green-100 p-1 text-green-600">
                    <Check className="size-3" />
                  </div>
                  <span className="text-sm text-foreground/80">{feature}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <Button
                className="h-12 w-full rounded-xl text-base shadow-lg shadow-green-200/50 transition-all hover:shadow-green-300/50"
                asChild
              >
                <Link href="/apply">Apply for ServiceFlow</Link>
              </Button>
              <Button
                variant="outline"
                className="h-12 w-full rounded-xl border-border/60 text-base hover:bg-muted/50"
                asChild
              >
                <a href="mailto:canoydaniel06@gmail.com?subject=ServiceFlow%20Onboarding%20Request">
                  Contact Sales
                </a>
              </Button>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Manual billing is coordinated after approval. Most applications are reviewed
              within 1 business day and include a status-link email.
            </p>

            <div className="mt-6 border-t border-border/50 pt-6 text-center">
              <p className="text-sm text-muted-foreground">Have questions?</p>
              <a
                href="mailto:canoydaniel06@gmail.com"
                className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline"
              >
                canoydaniel06@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
