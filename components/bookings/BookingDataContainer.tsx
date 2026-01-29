import BookingForm from "@/components/bookings/BookingForm";
import { notFound } from "next/navigation";
import { getCachedBusinessBySlug, getCachedServices } from "@/lib/data/cached";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function BookingDataContainer({
  businessSlug,
}: {
  businessSlug: string;
}) {
  const business = await getCachedBusinessBySlug(businessSlug);

  if (!business) {
    return notFound();
  }

  const services = await getCachedServices(business.id);
  const categories = Array.from(new Set(services.map((s) => s.category)));

  return (
    <Card className="w-full max-w-2xl shadow-lg border-border/50 bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
      <CardHeader className="text-center space-y-4 pb-6 border-b">
        <div className="flex justify-center">
          <Avatar className="h-20 w-20 border-4 border-background shadow-sm">
            <AvatarImage src="" alt={business.name} />
            <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
              {business.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl font-bold tracking-tight">
            {business.name}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground max-w-sm mx-auto">
            Book your next appointment with us easily online.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-6 md:p-8">
        <BookingForm services={services} categories={categories} />
      </CardContent>
    </Card>
  );
}
