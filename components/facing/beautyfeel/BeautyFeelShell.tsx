import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface BeautyFeelNavItem {
  label: string;
  href: string;
}

export interface BeautyFeelShellProps {
  businessName: string;
  businessSlug: string;
  navItems: BeautyFeelNavItem[];
  children: React.ReactNode;
}

export default function BeautyFeelShell({
  businessName,
  businessSlug,
  navItems,
  children,
}: BeautyFeelShellProps) {
  return (
    <div className="min-h-screen bg-[color:var(--bf-cream)] text-[color:var(--bf-ink)] [--bf-cream:oklch(0.98_0.01_92)] [--bf-ink:oklch(0.2_0.02_62)] [--bf-muted:oklch(0.52_0.02_75)] [--bf-blush:oklch(0.92_0.03_35)] [--bf-accent:oklch(0.86_0.08_38)] [--bf-sage:oklch(0.76_0.05_148)]">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[color:var(--bf-cream)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href={`/${businessSlug}`}
            className="text-lg font-semibold tracking-tight"
          >
            {businessName}
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[color:var(--bf-muted)] md:flex">
            {navItems.map((item) => {
              const hasHash = item.href.includes("#");
              const resolvedHref = item.href.startsWith("#")
                ? `/${businessSlug}${item.href}`
                : item.href;

              if (hasHash) {
                return (
                  <a
                    key={item.href}
                    href={resolvedHref}
                    className="transition-colors hover:text-[color:var(--bf-ink)]"
                  >
                    {item.label}
                  </a>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={resolvedHref}
                  className="transition-colors hover:text-[color:var(--bf-ink)]"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Button
            asChild
            className="bg-[color:var(--bf-accent)] text-[color:var(--bf-ink)] hover:bg-[color:var(--bf-accent)]/90"
          >
            <Link href={`/${businessSlug}/booking`}>Book now</Link>
          </Button>
        </div>
      </header>
      {children}
      <footer className="border-t border-black/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-[color:var(--bf-muted)] md:flex-row md:items-center md:justify-between">
          <span>{businessName} on Service Flow</span>
          <div className="flex items-center gap-4">
            <Link href={`/${businessSlug}/services`}>Services</Link>
            <Link href={`/${businessSlug}/booking`}>Booking</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
