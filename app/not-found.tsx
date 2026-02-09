import Link from "next/link";
import { constructMetadata } from "@/lib/metadata";
import { Button } from "@/components/ui/button";
import { Home, Compass, FileQuestion } from "lucide-react";

export const metadata = constructMetadata({
  title: "Page Not Found",
  description: "The page you are looking for does not exist.",
  noIndex: true,
});

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-green-50/40 via-background to-background" />
      <div className="absolute top-0 right-0 -z-10 w-1/2 h-1/2 bg-linear-to-bl from-emerald-100/20 to-transparent blur-3xl opacity-50" />
      <div className="absolute bottom-0 left-0 -z-10 w-1/2 h-1/2 bg-linear-to-tr from-teal-100/20 to-transparent blur-3xl opacity-50" />

      <div className="space-y-8 max-w-md mx-auto relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="space-y-4">
          <div className="mx-auto size-24 bg-green-50 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-100/50">
            <FileQuestion className="size-10 text-green-600" />
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Page not found
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Sorry, we couldn't find the page you're looking for. It might have
            been moved, deleted, or never existed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="rounded-full shadow-lg shadow-green-200/50 hover:shadow-green-300/50 transition-all hover:scale-105 bg-green-600 hover:bg-green-700 text-white gap-2"
          >
            <Link href="/">
              <Home className="size-4" />
              Back to Home
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-full border-border/60 hover:bg-muted/50 gap-2 transition-all hover:scale-105"
          >
            <Link href="/explore">
              <Compass className="size-4" />
              Explore Businesses
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
