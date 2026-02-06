import Link from "next/link";
import { Service } from "@/prisma/generated/prisma/client";
import BeautyFeelShell from "./BeautyFeelShell";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock } from "lucide-react";

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

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export interface BeautyFeelServicesProps {
  business: {
    name: string;
    slug: string;
  };
  services: Service[];
}

// Usage:
// <BeautyFeelServices business={business} services={services} />
export default function BeautyFeelServices({
  business,
  services,
}: BeautyFeelServicesProps) {
  const grouped = services.reduce<Record<string, Service[]>>((acc, service) => {
    acc[service.category] = acc[service.category] || [];
    acc[service.category].push(service);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();
  const navItems = [
    { label: "Overview", href: `/${business.slug}` },
    { label: "Reviews", href: `/${business.slug}#reviews` },
    { label: "Location", href: `/${business.slug}#location` },
  ];

  return (
    <BeautyFeelShell
      businessName={business.name}
      businessSlug={business.slug}
      navItems={navItems}
    >
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-[2.5rem] border border-black/10 bg-white/80 p-10 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--bf-muted)]">
            Services
          </p>
          <h1 className="mt-4 text-3xl font-semibold md:text-4xl">
            A curated menu for every glow ritual
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-[color:var(--bf-muted)]">
            Explore treatments by category. Each service is designed for calm,
            consistency, and visible results.
          </p>
          <Button
            asChild
            className="mt-6 bg-[color:var(--bf-accent)] text-[color:var(--bf-ink)] hover:bg-[color:var(--bf-accent)]/90"
          >
            <Link href={`/${business.slug}/booking`}>
              Book a service <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-24 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-28 lg:h-fit">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--bf-muted)]">
            Categories
          </p>
          <nav className="space-y-2 text-sm">
            {categories.map((category) => (
              <a
                key={category}
                href={`#${slugify(category)}`}
                className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/70 px-4 py-2 text-[color:var(--bf-muted)] transition-colors hover:text-[color:var(--bf-ink)]"
              >
                <span>{category}</span>
                <span className="text-xs">{grouped[category].length}</span>
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-12">
          {categories.map((category) => (
            <section
              key={category}
              id={slugify(category)}
              className="scroll-mt-28 space-y-4"
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--bf-muted)]">
                    {category}
                  </p>
                  <h2 className="text-2xl font-semibold">{category}</h2>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {grouped[category].map((service) => (
                  <div
                    key={service.id}
                    className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {service.name}
                        </h3>
                        <p className="mt-2 text-sm text-[color:var(--bf-muted)]">
                          {service.description ||
                            "A tailored session with thoughtful details."}
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
              </div>
            </section>
          ))}
        </div>
      </section>
    </BeautyFeelShell>
  );
}
