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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-green-100/20 via-background to-background opacity-80"></div>
      <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-linear-to-bl from-emerald-100/50 via-teal-50/30 to-transparent blur-[100px] rounded-full translate-x-1/3 -translate-y-1/4"></div>
      <div className="absolute bottom-0 left-0 -z-10 w-1/2 h-full bg-linear-to-tr from-blue-100/40 via-indigo-50/30 to-transparent blur-[100px] rounded-full -translate-x-1/3 translate-y-1/4"></div>
      <div className="absolute top-1/2 left-1/2 -z-20 w-[800px] h-[800px] bg-linear-to-r from-green-50/30 to-blue-50/30 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2"></div>

      <div className="container mx-auto px-6 text-center max-w-5xl">
        <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Badge
            variant="outline"
            className="rounded-full px-4 py-1 border-green-200 bg-green-50/50 text-green-700 gap-2 hover:bg-green-100 transition-colors cursor-default backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="font-medium">v1.0 is now live</span>
          </Badge>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-8 text-foreground animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards delay-100">
          Manage your service <br className="hidden md:block" />
          business with{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-green-600 via-emerald-600 to-teal-600 drop-shadow-sm">
            ease
          </span>
        </h1>

        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards delay-200">
          Streamline appointments, manage staff attendance, and track payments
          all in one unified platform. ServiceFlow gives you the tools to grow
          without the chaos.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards delay-300">
          <AuthDialog>
            <Button className="rounded-full h-11 px-8 text-sm font-medium shadow-lg shadow-green-200/50 hover:shadow-green-300/50 transition-all hover:scale-105">
              Start for free <ArrowRight className="ml-2 size-4" />
            </Button>
          </AuthDialog>
          <Button
            variant="outline"
            className="rounded-full h-11 px-8 text-sm font-medium border-border/60 hover:bg-muted/50 backdrop-blur-sm gap-2 transition-all hover:scale-105"
          >
            <PlayCircle className="size-4" /> View Live Demo
          </Button>
        </div>

        <div className="mt-20 pt-10 border-t border-border/30 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards delay-500">
          <p className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">
            Perfect for modern service businesses
          </p>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-8 opacity-80">
            {[
              { name: "Salons", icon: Sparkles },
              { name: "Barbershops", icon: Scissors },
              { name: "Spas", icon: Flower2 },
              { name: "Clinics", icon: Stethoscope },
            ].map((item) => (
              <div
                key={item.name}
                className="font-semibold text-lg flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors group"
              >
                <div className="size-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-green-50 group-hover:text-green-600 transition-colors duration-300">
                  <item.icon className="size-5" />
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
