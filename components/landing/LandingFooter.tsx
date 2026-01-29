import Link from "next/link";
import { headers } from "next/headers";

export default async function LandingFooter() {
  await headers();
  const year = new Date().getFullYear();

  return (
    <footer className="py-12 border-t mt-auto bg-background">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="size-6 bg-green-600/20 rounded-md flex items-center justify-center">
            <span className="text-green-700 font-bold text-xs">S</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">
            ServiceFlow
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          &copy; {year} ServiceFlow. All rights reserved.
        </p>
        <div className="flex gap-6">
          <Link
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
