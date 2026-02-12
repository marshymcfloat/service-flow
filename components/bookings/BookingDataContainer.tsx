import BookingForm from "@/components/bookings/BookingForm";
import { notFound } from "next/navigation";
import {
  getCachedBusinessBySlug,
  getCachedServices,
  getCachedPackages,
} from "@/lib/data/cached";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default async function BookingDataContainer({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const business = await getCachedBusinessBySlug(businessSlug);

  if (!business) {
    return notFound();
  }

  const services = await getCachedServices(business.id);
  const packages = await getCachedPackages(business.id);
  const categories = Array.from(new Set(services.map((s) => s.category)));

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full">
      <div className="relative w-full lg:w-[45%] lg:min-h-screen bg-muted/30 border-b lg:border-b-0 lg:border-r border-border p-8 lg:p-12 flex flex-col justify-between overflow-hidden">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] opacity-[0.4] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]"
          style={{
            backgroundSize: "16px 16px",
            maskImage:
              "radial-gradient(ellipse 50% 50% at 50% 50%, #000 70%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 50% 50% at 50% 50%, #000 70%, transparent 100%)",
          }}
        />

        <div className="space-y-8 relative z-10">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 lg:h-20 lg:w-20 border-2 border-primary/10 shadow-sm shrink-0">
              <AvatarFallback className="text-xl lg:text-2xl font-bold bg-primary text-primary-foreground">
                {business.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-display">
                {business.name}
              </h1>
              <p className="text-muted-foreground text-base max-w-sm">
                Book your next appointment with us easily online.
              </p>
            </div>
          </div>
        </div>

        <div className="hidden lg:block mt-auto pt-12 relative z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-1 w-1 rounded-full bg-primary/50" />
            <span>Powered by Service Flow</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full bg-background relative flex flex-col items-center justify-center  p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full  space-y-8">
          <div className="space-y-2 lg:hidden">
            <h2 className="text-xl font-semibold">Complete your booking</h2>
            <p className="text-sm text-muted-foreground">
              Fill in the details below to schedule your service.
            </p>
          </div>
          <div className=" w-full">
            <BookingForm
              services={services}
              packages={packages}
              categories={categories}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
