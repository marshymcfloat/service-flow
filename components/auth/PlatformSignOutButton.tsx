"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

export function PlatformSignOutButton({ className }: { className?: string }) {
  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100",
        className,
      )}
    >
      <LogOut className="h-4 w-4" />
      Log out
    </button>
  );
}
