import GiftCardClaimForm from "@/components/bookings/GiftCardClaimForm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCachedBusinessBySlug } from "@/lib/data/cached";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Claim Gift Card | Service Flow",
  description:
    "Verify your gift card and schedule your appointment online in minutes.",
  robots: {
    index: false,
    follow: true,
  },
};

export default async function ClaimGiftCardPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const business = await getCachedBusinessBySlug(businessSlug);

  if (!business) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border border-border">
            <AvatarFallback className="font-semibold">
              {business.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Gift card claim
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {business.name}
            </h1>
          </div>
          <Badge variant="secondary" className="ml-auto">
            Online
          </Badge>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="text-base sm:text-lg">
              Claim your gift card booking
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <GiftCardClaimForm businessSlug={businessSlug} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

