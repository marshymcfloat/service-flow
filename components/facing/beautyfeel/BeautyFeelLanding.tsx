import Image from "next/image";
import Link from "next/link";
import {
  BusinessHours,
  SaleEvent,
  Service,
} from "@/prisma/generated/prisma/client";
import { beautyFeelContent } from "./content";
import BeautyFeelShell from "./BeautyFeelShell";
import BeautyFeelMap from "./BeautyFeelMapWrapper";
import BeautyFeelSectionSeam from "./BeautyFeelSectionSeam";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, MapPin, Sparkles, Star } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

const formatDuration = (minutes?: number | null) => {
  if (!minutes) return "Flexible timing";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
};

const formatTime = (value?: string | null) => {
  if (!value) return "By appointment";
  const [rawHours, rawMinutes] = value.split(":").map(Number);
  const hours = rawHours % 12 || 12;
  const minutes = rawMinutes.toString().padStart(2, "0");
  const period = rawHours >= 12 ? "PM" : "AM";
  return `${hours}:${minutes} ${period}`;
};

const dayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface BeautyFeelLandingProps {
  business: {
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  services: Service[];
  businessHours: BusinessHours[];
  saleEvents: SaleEvent[];
}

// Usage:
// <BeautyFeelLanding business={business} services={services} businessHours={hours} saleEvents={events} />
export default function BeautyFeelLanding({
  business,
  services,
  businessHours,
  saleEvents,
}: BeautyFeelLandingProps) {
  const navItems = [
    { label: "Services", href: `/${business.slug}#services` },
    { label: "Reviews", href: `/${business.slug}#reviews` },
    { label: "Location", href: `/${business.slug}#location` },
  ];

  const previewServices = services.slice(0, 6);
  const heroImage =
    business.imageUrl ||
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80";

  const primaryHours = businessHours.filter(
    (hour) => hour.category === "GENERAL",
  );
  const hoursSource = primaryHours.length ? primaryHours : businessHours;
  const hoursByDay = dayLabels.map((label, index) => {
    const entry = hoursSource.find((hour) => hour.day_of_week === index);
    return {
      label,
      isClosed: entry?.is_closed ?? false,
      open: entry?.open_time,
      close: entry?.close_time,
    };
  });

  const todayIndex = new Date().getDay();
  const todayHours = hoursByDay[todayIndex];
  const hasLocation = business.latitude !== null && business.longitude !== null;

  return (
    <BeautyFeelShell
      businessName={business.name}
      businessSlug={business.slug}
      navItems={navItems}
    >
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-0 h-72 w-72 rounded-full bg-[color:var(--bf-blush)]/70 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-120px] left-[-80px] h-80 w-80 rounded-full bg-[color:var(--bf-sage)]/50 blur-3xl" />
        <BeautyFeelSectionSeam />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <Badge
              variant="secondary"
              className="w-fit bg-white/80 text-[color:var(--bf-ink)]"
            >
              {beautyFeelContent.hero.eyebrow}
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl lg:text-6xl">
              {beautyFeelContent.hero.title}
            </h1>
            <p className="text-lg text-[color:var(--bf-muted)]">
              {beautyFeelContent.hero.description}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="bg-[color:var(--bf-accent)] text-[color:var(--bf-ink)] hover:bg-[color:var(--bf-accent)]/90"
              >
                <Link href={`/${business.slug}/booking`}>
                  {beautyFeelContent.hero.primaryCta}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-black/15 bg-transparent text-[color:var(--bf-ink)] hover:bg-black/5"
              >
                <Link href={`/${business.slug}/services`}>
                  {beautyFeelContent.hero.secondaryCta}
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 text-xs uppercase tracking-[0.2em] text-[color:var(--bf-muted)] sm:grid-cols-3">
              {beautyFeelContent.quickFacts.map((fact) => (
                <div key={fact.label} className="rounded-2xl bg-white/70 p-3">
                  <p className="text-[10px]">{fact.label}</p>
                  <p className="mt-1 text-sm font-semibold text-[color:var(--bf-ink)]">
                    {fact.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative animate-in fade-in slide-in-from-right-6 duration-700 delay-150 fill-mode-backwards">
            <div className="aspect-[4/5] overflow-hidden rounded-[2.5rem] border border-black/10 bg-[color:var(--bf-blush)]/50 shadow-xl">
              <Image
                src={heroImage}
                alt={`${business.name} studio`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
            <div className="absolute -bottom-6 -left-6 rounded-2xl border border-black/10 bg-white/90 p-4 shadow-lg">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Star className="h-4 w-4 text-[color:var(--bf-accent)]" />
                <span>Rated 5.0 by guests</span>
              </div>
              <p className="mt-1 text-xs text-[color:var(--bf-muted)]">
                Based on recent reviews
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto -mt-10 grid max-w-6xl gap-4 px-6 pb-20 pt-4 md:grid-cols-3">
        <BeautyFeelSectionSeam variant="highlights" />
        {beautyFeelContent.highlights.map((item, index) => (
          <div
            key={item.title}
            className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-[color:var(--bf-accent)]" />
              {item.title}
            </div>
            <p className="mt-3 text-sm text-[color:var(--bf-muted)]">
              {item.description}
            </p>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-24 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-16">
          <section id="services" className="scroll-mt-28 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--bf-muted)]">
                  Signature services
                </p>
                <h2 className="text-2xl font-semibold md:text-3xl">
                  Treatments designed for glow
                </h2>
              </div>
              <Button
                asChild
                variant="ghost"
                className="text-[color:var(--bf-ink)]"
              >
                <Link href={`/${business.slug}/services`}>
                  See full menu <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {previewServices.map((service) => (
                <div
                  key={service.id}
                  className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--bf-muted)]">
                        {service.category}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold">
                        {service.name}
                      </h3>
                      <p className="mt-2 text-sm text-[color:var(--bf-muted)]">
                        {service.description ||
                          "Tailored care with a gentle, restorative finish."}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatCurrency(service.price)}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-[color:var(--bf-muted)]">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(service.duration)}
                  </div>
                </div>
              ))}
              {!previewServices.length && (
                <div className="rounded-3xl border border-dashed border-black/20 bg-white/60 p-6 text-sm text-[color:var(--bf-muted)]">
                  No services listed yet. Add services to show them here.
                </div>
              )}
            </div>
          </section>

          <section id="events" className="scroll-mt-28 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--bf-muted)]">
                Active events
              </p>
              <h2 className="text-2xl font-semibold md:text-3xl">
                Seasonal offers and bundles
              </h2>
            </div>
            <div className="space-y-4">
              {saleEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{event.title}</h3>
                      <p className="mt-2 text-sm text-[color:var(--bf-muted)]">
                        {event.description ||
                          "Enjoy limited-time pricing across select services."}
                      </p>
                    </div>
                    <span className="rounded-full bg-[color:var(--bf-accent)]/40 px-3 py-1 text-xs font-semibold">
                      {event.discount_type === "PERCENTAGE"
                        ? `${event.discount_value}% off`
                        : `${formatCurrency(event.discount_value)} off`}
                    </span>
                  </div>
                </div>
              ))}
              {!saleEvents.length && (
                <div className="rounded-3xl border border-dashed border-black/20 bg-white/60 p-6 text-sm text-[color:var(--bf-muted)]">
                  No active promotions right now. Check back for seasonal
                  bundles.
                </div>
              )}
            </div>
          </section>

          <section id="reviews" className="scroll-mt-28 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--bf-muted)]">
                Guest notes
              </p>
              <h2 className="text-2xl font-semibold md:text-3xl">
                Loved for calm, precise care
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {beautyFeelContent.testimonials.map((testimonial) => (
                <div
                  key={testimonial.name}
                  className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm"
                >
                  <div className="flex items-center gap-1 text-[color:var(--bf-accent)]">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-[color:var(--bf-ink)]">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[color:var(--bf-muted)]">
                    {testimonial.name} - {testimonial.service}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section id="location" className="scroll-mt-28 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--bf-muted)]">
                Visit us
              </p>
              <h2 className="text-2xl font-semibold md:text-3xl">
                Find your calm in person
              </h2>
            </div>
            {hasLocation ? (
              <BeautyFeelMap
                latitude={business.latitude as number}
                longitude={business.longitude as number}
                label={business.name}
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-black/20 bg-white/60 p-6 text-sm text-[color:var(--bf-muted)]">
                Add a location pin to show your map.
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-black/10 bg-white/80 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4 text-[color:var(--bf-accent)]" />
                  Studio hours
                </div>
                <div className="mt-4 space-y-2 text-sm text-[color:var(--bf-muted)]">
                  {hoursByDay.map((day) => (
                    <div
                      key={day.label}
                      className="flex items-center justify-between"
                    >
                      <span>{day.label}</span>
                      <span>
                        {day.isClosed
                          ? "Closed"
                          : `${formatTime(day.open)} - ${formatTime(day.close)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-black/10 bg-white/80 p-6">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-[color:var(--bf-accent)]" />
                  Studio note
                </div>
                <p className="mt-4 text-sm text-[color:var(--bf-muted)]">
                  {business.description ||
                    "Appointments are tailored to your needs. Arrive 10 minutes early to settle in."}
                </p>
                {hasLocation && (
                  <Button
                    asChild
                    variant="outline"
                    className="mt-6 border-black/15 bg-transparent text-[color:var(--bf-ink)] hover:bg-black/5"
                  >
                    <a
                      href={`https://www.google.com/maps?q=${business.latitude},${business.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get directions
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
          <div className="rounded-3xl border border-black/10 bg-white/85 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--bf-muted)]">
              Booking desk
            </p>
            <h3 className="mt-3 text-xl font-semibold">
              Reserve your calm moment
            </h3>
            <p className="mt-3 text-sm text-[color:var(--bf-muted)]">
              Secure your appointment in under a minute. Choose your services
              and preferred time.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-[color:var(--bf-muted)]">
              <Clock className="h-4 w-4" />
              {todayHours?.isClosed
                ? "Closed today"
                : `Open today ${formatTime(todayHours?.open)} - ${formatTime(
                    todayHours?.close,
                  )}`}
            </div>
            <Button
              asChild
              className="mt-6 w-full bg-[color:var(--bf-accent)] text-[color:var(--bf-ink)] hover:bg-[color:var(--bf-accent)]/90"
            >
              <Link href={`/${business.slug}/booking`}>Book now</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="mt-3 w-full border-black/15 bg-transparent text-[color:var(--bf-ink)] hover:bg-black/5"
            >
              <Link href={`/${business.slug}/services`}>View services</Link>
            </Button>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/85 p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--bf-muted)]">
              Social
            </p>
            <h3 className="mt-3 text-lg font-semibold">Follow BeautyFeel</h3>
            <div className="mt-4 space-y-2 text-sm">
              {beautyFeelContent.socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/60 px-4 py-2 text-[color:var(--bf-muted)] transition-colors hover:text-[color:var(--bf-ink)]"
                >
                  <span>{social.label}</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </BeautyFeelShell>
  );
}
