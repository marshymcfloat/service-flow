import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import GiftCardClaimForm from "@/components/bookings/GiftCardClaimForm";
import { getCachedBusinessBySlug } from "@/lib/data/cached";
import { notFound } from "next/navigation";

export interface PublicGiftCardClaimModalProps {
  params: Promise<{ businessSlug: string }>;
}

export default async function PublicGiftCardClaimModal({
  params,
}: PublicGiftCardClaimModalProps) {
  const { businessSlug } = await params;
  const business = await getCachedBusinessBySlug(businessSlug);

  if (!business) {
    return notFound();
  }

  return (
    <Modal
      className="h-[95dvh] w-[95vw] max-w-none gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl sm:border"
      modal={true}
    >
      <div className="flex h-full flex-col">
        <div className="border-b bg-background/95 px-4 py-3 pr-11 backdrop-blur-sm sm:px-6 sm:py-4 sm:pr-12">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarFallback className="font-semibold">
                {business.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Gift card claim
              </p>
              <p className="truncate text-base font-semibold">
                Claim with {business.name}
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto shrink-0">
              Online
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Verify your gift card, pick a date and time, then confirm your
            appointment.
          </p>
        </div>

        <div className="max-h-[calc(100dvh-85px)] overflow-y-auto overscroll-contain px-3 py-3 sm:max-h-[calc(90vh-96px)] sm:px-6 sm:py-5">
          <GiftCardClaimForm businessSlug={businessSlug} />
        </div>
      </div>
    </Modal>
  );
}

