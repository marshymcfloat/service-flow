import PublicBookingModal from "@/components/bookings/PublicBookingModal";

export default async function PublicBookingModalPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  return <PublicBookingModal params={params} />;
}
