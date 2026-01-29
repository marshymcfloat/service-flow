"use client";

import AuthDialog from "@/components/auth/AuthDialog";
import { Button } from "@/components/ui/button";
import { Check, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 -z-10 w-full h-full bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-green-50/40 via-transparent to-transparent"></div>
      <div className="absolute bottom-0 left-0 -z-10 w-full h-full bg-[radial-gradient(circle_at_bottom_left,var(--tw-gradient-stops))] from-blue-50/40 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-grid-black/[0.02] -z-20"></div>

      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-lg">
            No hidden fees. No complicated tiers. Just one all-inclusive plan to
            power your entire business.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="relative bg-background rounded-[2rem] p-8 md:p-10 shadow-xl shadow-green-100/20 border border-green-100 dark:border-green-900/20 overflow-hidden group hover:border-green-300/50 transition-all duration-300">
            <div className="absolute -inset-px bg-gradient-to-l from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem] pointer-events-none" />

            <div className="absolute top-0 right-0 bg-green-100 text-green-700 text-xs font-bold px-4 py-1.5 rounded-bl-xl border-l border-b border-green-200">
              ALL-INCLUSIVE
            </div>

            <div className="mb-6">
              <Badge
                variant="secondary"
                className="mb-4 bg-orange-100 text-orange-700 hover:bg-orange-100 border-none"
              >
                Limited Offer: 1 Month Free
              </Badge>
              <h3 className="text-2xl font-bold text-foreground">
                Professional Plan
              </h3>
              <p className="text-muted-foreground mt-2">
                Everything you need to grow.
              </p>
            </div>

            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-5xl font-extrabold text-foreground tracking-tight">
                ₱4,000
              </span>
              <span className="text-muted-foreground font-medium">/month</span>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50/50 border border-green-100/50">
                <div className="p-1.5 bg-green-100 rounded-full text-green-600 shrink-0">
                  <Globe className="size-4" />
                </div>
                <div>
                  <span className="font-semibold text-green-900 block text-sm">
                    Free Client-Facing Website
                  </span>
                  <span className="text-xs text-green-700/80">
                    Your own branded booking portal
                  </span>
                </div>
              </div>

              {[
                "Smart Scheduling & Calendar",
                "Staff Attendance & Payroll",
                "Unlimited Bookings",
                "Business Analytics Dashboard",
                "Priority Support",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="p-1 rounded-full bg-green-100 text-green-600 shrink-0">
                    <Check className="size-3" />
                  </div>
                  <span className="text-sm text-foreground/80">{feature}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <AuthDialog>
                <Button className="w-full h-12 rounded-xl text-base shadow-lg shadow-green-200/50 hover:shadow-green-300/50 transition-all">
                  Get Started Now
                </Button>
              </AuthDialog>
              <Button
                variant="outline"
                className="w-full h-12 rounded-xl text-base border-border/60 hover:bg-muted/50"
                asChild
              >
                <a href="mailto:canoydaniel06@gmail.com?subject=Request for ServiceFlow Demo">
                  Book a Demo
                </a>
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Minimum 3-month contract required.
            </p>

            <div className="mt-6 pt-6 border-t border-border/50 text-center">
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
