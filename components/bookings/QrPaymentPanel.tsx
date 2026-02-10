"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

export interface QrPaymentPanelProps {
  qrImage: string;
  amountLabel: string;
  status: "pending" | "paid" | "failed" | "expired";
  expiresAt?: string;
  onClose: () => void;
  onRetry?: () => void;
}

const getImageSrc = (image: string) =>
  image.startsWith("data:") ? image : `data:image/png;base64,${image}`;

export default function QrPaymentPanel({
  qrImage,
  amountLabel,
  status,
  expiresAt,
  onClose,
  onRetry,
}: QrPaymentPanelProps) {
  const [remaining, setRemaining] = useState<string | null>(null);
  const portalRoot = typeof document !== "undefined" ? document.body : null;

  useEffect(() => {
    if (!expiresAt) return;

    const expiryTime = new Date(expiresAt).getTime();
    const update = () => {
      const diff = expiryTime - Date.now();
      if (diff <= 0) {
        setRemaining("Expired");
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const statusCopy = useMemo(() => {
    switch (status) {
      case "paid":
        return "Payment received. Finalizing your booking...";
      case "failed":
        return "Payment failed. Please try again.";
      case "expired":
        return "QR code expired. Please generate a new one.";
      default:
        return "Scan with any QR PH app to complete payment.";
    }
  }, [status]);

  const statusIcon = useMemo(() => {
    if (status === "paid") {
      return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    }
    if (status === "failed" || status === "expired") {
      return <XCircle className="h-5 w-5 text-rose-500" />;
    }
    return <Clock3 className="h-5 w-5 text-amber-500" />;
  }, [status]);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!portalRoot) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 py-10 backdrop-blur-sm pointer-events-auto"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-md rounded-2xl border border-black/10 bg-white/95 p-6 shadow-xl pointer-events-auto">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            QR Payment
          </div>
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
            {statusIcon}
            <span>{statusCopy}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Amount to pay: <span className="font-semibold">{amountLabel}</span>
          </div>
          <div className="mx-auto w-56 rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
            <Image
              src={getImageSrc(qrImage)}
              alt="QR payment code"
              width={224}
              height={224}
              unoptimized
              className={cn(
                "w-full",
                status === "paid" && "opacity-60 grayscale",
              )}
            />
          </div>
          {expiresAt && (
            <p className="text-xs text-muted-foreground">
              Expires in{" "}
              <span className="font-semibold">
                {remaining || "calculating..."}
              </span>
            </p>
          )}
          <div className="space-y-2">
            {status === "failed" || status === "expired" ? (
              <Button type="button" onClick={onRetry} className="w-full">
                Try again
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={handleDismiss}
              className="w-full"
            >
              Back to booking
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Booking confirmation appears after payment is verified.
          </p>
        </div>
      </Card>
    </div>,
    portalRoot,
  );
}
