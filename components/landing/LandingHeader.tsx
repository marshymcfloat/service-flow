import AuthDialog from "@/components/auth/AuthDialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import Image from "next/image";

export default function LandingHeader() {
  return (
    <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-border/40 supports-backdrop-filter:bg-background/60 transition-all duration-300">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 group cursor-pointer">
          <Image
            src="/serviceFlow-logo.png"
            alt="ServiceFlow Logo"
            width={64}
            height={64}
            className="size-10 rounded-lg shadow-sm object-cover shadow-green-200 group-hover:shadow-md group-hover:scale-105 transition-all duration-300"
          />
          <span className="font-bold text-xl tracking-tight select-none group-hover:text-green-700 transition-colors">
            ServiceFlow
          </span>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/#features"
              className="text-sm font-medium text-muted-foreground hover:text-green-600 transition-colors"
            >
              Features
            </Link>
            <Link
              href="/#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-green-600 transition-colors"
            >
              Pricing
            </Link>
          </nav>
          <div className="w-px h-6 bg-border hidden md:block"></div>
          <AuthDialog>
            <Button className="rounded-full shadow-lg shadow-green-100 hover:shadow-green-200 transition-all active:scale-95 duration-200">
              Get Started
            </Button>
          </AuthDialog>
        </div>
      </div>
    </header>
  );
}
