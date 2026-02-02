import Image from "next/image";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import AuthForm from "./AuthForm";
import { Sparkles } from "lucide-react";

export default function AuthDialog({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button
            size="lg"
            className="group relative cursor-pointer overflow-hidden rounded-full border border-white/20 bg-white/10 px-8 py-6 text-base font-semibold text-white shadow-xl backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:shadow-2xl hover:border-white/40"
          >
            <div className="absolute inset-0 bg-linear-to-r from-primary/20 via-transparent to-primary/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative flex items-center gap-2 font-display tracking-wide">
              Get Started <Sparkles className="h-4 w-4" />
            </span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[425px] md:max-w-4xl lg:max-w-5xl bg-white border-0 shadow-2xl">
        <div className="grid h-full w-full grid-cols-1 md:h-[650px] md:grid-cols-[2fr_3fr]">
          <div className="relative hidden w-full flex-col justify-between overflow-hidden bg-[#0A0A0A] p-10 text-white md:flex">
            <div className="absolute top-0 left-0 w-full h-full opacity-40">
              <div className="absolute top-[-20%] right-[-20%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
              <div className="absolute bottom-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-[100px]" />
            </div>

            <div
              className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            />

            <div className="relative z-10 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                <div className="h-4 w-4 rounded-sm bg-white" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">
                ServiceFlow
              </span>
            </div>

            <div className="relative z-10 space-y-6">
              <h3 className="font-display text-4xl font-bold leading-tight tracking-tight">
                Streamline Your <br />
                <span className="text-white/80">Business Logic.</span>
              </h3>
              <p className="max-w-[80%] text-sm leading-relaxed text-white/60 font-sans">
                Manage employees, bookings, and payroll in one unified,
                intelligent platform designed for scale.
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-4 text-xs font-medium text-white/40 font-mono">
              <span>© 2026 ServiceFlow Inc.</span>
            </div>
          </div>

          <div className="flex h-full w-full flex-col justify-center bg-white p-8 md:p-14 lg:p-16">
            <DialogHeader className="mb-8 space-y-2 text-left">
              <DialogTitle className="font-display text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
                Welcome Back
              </DialogTitle>
              <DialogDescription className="text-base text-slate-500 font-sans">
                Enter your credentials to access your workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="w-full">
              <AuthForm />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
