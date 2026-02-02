import Link from "next/link";
import { headers } from "next/headers";
import Image from "next/image";

export default async function LandingFooter() {
  await headers();
  const year = new Date().getFullYear();

  return (
    <footer className="py-12 border-t mt-auto bg-background">
      <div className="container mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <Image
            src="/ServiceFlow2-logo.png"
            alt="ServiceFlow Logo"
            width={40}
            height={40}
            className="size-8 rounded-lg object-cover"
          />
          <span className="font-semibold text-lg tracking-tight">
            ServiceFlow
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          &copy; {year} ServiceFlow. All rights reserved.
        </p>
        <div className="flex gap-6">
          <Link
            href="/explore"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Explore
          </Link>
          <Link
            href={`/privacy`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href={`/terms`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
