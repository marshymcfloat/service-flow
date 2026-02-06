import BookingForm from "@/components/bookings/BookingForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  getCachedBusinessBySlug,
  getCachedPackages,
  getCachedServices,
} from "@/lib/data/cached";
import { notFound } from "next/navigation";

export interface PublicBookingModalProps {
  params: Promise<{ businessSlug: string }>;
}

export default async function PublicBookingModal({
  params,
}: PublicBookingModalProps) {
  const { businessSlug } = await params;
  const business = await getCachedBusinessBySlug(businessSlug);

  if (!business) {
    return notFound();
  }

  const [services, packages] = await Promise.all([
    getCachedServices(business.id),
    getCachedPackages(business.id),
  ]);

  const categories = Array.from(new Set(services.map((s) => s.category)));

  return (
    <Modal
      title={`Book with ${business.name}`}
      description="Choose services, pick a time, and confirm your slot."
      className="sm:max-w-4xl"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 border border-border">
            <AvatarImage src="" alt={business.name} />
            <AvatarFallback className="font-semibold">
              {business.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Secure booking
            </p>
            <p className="text-base font-semibold">{business.name}</p>
          </div>
          <Badge variant="secondary" className="ml-auto">
            Online
          </Badge>
        </div>

        <BookingForm
          services={services}
          packages={packages}
          categories={categories}
          isModal={true}
        />
      </div>
    </Modal>
  );
}
