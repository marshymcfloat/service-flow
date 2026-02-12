"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { ReactNode, useRef } from "react";

import { cn } from "@/lib/utils";

export function Modal({
  children,
  title,
  description,
  className,
  modal = true,
  showBackdrop = true,
  backdropClassName,
  closeOnBackdrop = true,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  modal?: boolean;
  showBackdrop?: boolean;
  backdropClassName?: string;
  closeOnBackdrop?: boolean;
}) {
  const router = useRouter();
  const lastDismissAtRef = useRef(0);

  function onDismiss() {
    // Dismiss events can fire twice in quick succession (e.g. pointer + open state).
    // Guard only the current interaction, but allow future open/close cycles.
    const now = Date.now();
    if (now - lastDismissAtRef.current < 300) return;
    lastDismissAtRef.current = now;

    router.back();
  }

  return (
    <Dialog
      open={true}
      modal={modal}
      onOpenChange={(open) => !open && onDismiss()}
    >
      {!modal && showBackdrop && (
        <DialogPortal>
          <div
            className={cn(
              "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm",
              backdropClassName,
            )}
            onClick={closeOnBackdrop ? onDismiss : undefined}
          />
        </DialogPortal>
      )}
      <DialogContent
        className={cn(
          "sm:max-w-[600px] overflow-y-auto max-h-[90vh]",
          className,
        )}
      >
        <DialogHeader>
          {title ? <DialogTitle>{title}</DialogTitle> : <DialogTitle className="sr-only">Dialog</DialogTitle>}
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
