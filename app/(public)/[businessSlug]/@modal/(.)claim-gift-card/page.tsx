import PublicGiftCardClaimModal from "@/components/bookings/PublicGiftCardClaimModal";

export default async function PublicGiftCardClaimModalPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  return <PublicGiftCardClaimModal params={params} />;
}

