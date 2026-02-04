"use client";

import AuthDialog from "@/components/auth/AuthDialog";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  PlayCircle,
  Sparkles,
  Scissors,
  Flower2,
  Stethoscope,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function HeroSection() {
  return (
    <section
      className="relative pt-28 pb-16 md:pt-40 md:pb-24 overflow-hidden"
      id="hero"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-green-100/20 via-background to-background opacity-80" />
      <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-linear-to-bl from-emerald-100/50 via-teal-50/30 to-transparent blur-[100px] rounded-full translate-x-1/3 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 -z-10 w-1/2 h-full bg-linear-to-tr from-blue-100/40 via-indigo-50/30 to-transparent blur-[100px] rounded-full -translate-x-1/3 translate-y-1/4" />

      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-5 gap-8 md:gap-12 items-center">
          <div className="md:col-span-3 text-center md:text-left">
            <div className="flex justify-center md:justify-start mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Badge
                variant="outline"
                className="rounded-full px-4 py-1.5 border-green-200 bg-green-50/50 text-green-700 gap-2 hover:bg-green-100 transition-colors cursor-default backdrop-blur-sm font-mono text-xs"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="font-medium">v1.0 is now live</span>
              </Badge>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-foreground animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards delay-100 leading-[1.1]">
              Manage your{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-green-600 via-emerald-500 to-teal-500">
                service business
              </span>{" "}
              with ease
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards delay-200">
              Streamline appointments, manage staff attendance, and track
              payments all in one unified platform.
            </p>

            <div className="flex flex-col sm:flex-row items-center md:items-start gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards delay-300">
              <AuthDialog>
                <Button className="rounded-full h-12 px-8 text-base font-semibold shadow-lg shadow-green-200/50 hover:shadow-green-300/50 transition-all hover:scale-105 active:scale-95">
                  Start for free <ArrowRight className="ml-2 size-4" />
                </Button>
              </AuthDialog>
              <Button
                variant="outline"
                className="rounded-full h-12 px-8 text-base font-medium border-border/60 hover:bg-muted/50 backdrop-blur-sm gap-2 transition-all hover:scale-105"
              >
                <PlayCircle className="size-5" /> View Demo
              </Button>
            </div>
          </div>

          <div className="md:col-span-2 relative animate-in fade-in slide-in-from-right-8 duration-700 fill-mode-backwards delay-400">
            <div className="relative bg-linear-to-br from-green-50 to-emerald-100/50 rounded-3xl p-6 shadow-xl shadow-green-100/30 border border-green-100/50">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CalendarCheck className="size-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Today's Bookings
                    </p>
                    <p className="text-xs text-muted-foreground">March 15</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { time: "9:00 AM", client: "Maria S.", service: "Haircut" },
                    {
                      time: "10:30 AM",
                      client: "John D.",
                      service: "Beard Trim",
                    },
                    {
                      time: "2:00 PM",
                      client: "Ana L.",
                      service: "Full Service",
                    },
                  ].map((booking, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-xl text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground w-16">
                          {booking.time}
                        </span>
                        <span className="font-medium">{booking.client}</span>
                      </div>
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        {booking.service}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 bg-white shadow-xl rounded-2xl p-4 border border-border/50 animate-in fade-in zoom-in duration-500 delay-700">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="size-4 text-emerald-600" />
                </div>
                <div>
                  <span className="text-lg font-bold text-green-600">+23%</span>
                  <p className="text-xs text-muted-foreground">
                    Bookings this month
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-10 border-t border-border/30 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards delay-500">
          <p className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">
            Perfect for modern service businesses
          </p>
          <div className="flex flex-wrap gap-x-10 gap-y-6 opacity-70">
            {[
              { name: "Salons", icon: Sparkles },
              { name: "Barbershops", icon: Scissors },
              { name: "Spas", icon: Flower2 },
              { name: "Clinics", icon: Stethoscope },
            ].map((item) => (
              <div
                key={item.name}
                className="font-semibold text-base flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors group"
              >
                <div className="size-9 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-green-50 group-hover:text-green-600 transition-colors duration-300">
                  <item.icon className="size-4" />
                </div>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
