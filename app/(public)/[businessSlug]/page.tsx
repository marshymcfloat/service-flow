import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { connection } from "next/server";
import { unstable_cache } from "next/cache";
import BeautyFeelLanding from "@/components/facing/beautyfeel/BeautyFeelLanding";
import {
  beautyFeelContent,
  isBeautyFeelSlug,
} from "@/components/facing/beautyfeel/content";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";
import BusinessFacingSkeleton from "@/components/skeletons/BusinessFacingSkeleton";

interface Props {
  params: Promise<{
    businessSlug: string;
  }>;
}

const getBusinessMetadata = unstable_cache(
  async (slug: string) => {
    return prisma.business.findUnique({
      where: { slug },
      select: { name: true, slug: true, description: true, imageUrl: true },
    });
  },
  ["business-metadata"],
  { revalidate: 60 },
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { businessSlug } = await params;
  const business = await getBusinessMetadata(businessSlug);

  if (!business) {
    return {
      title: "Business Not Found",
    };
  }

  const imageUrl = business.imageUrl || "/og-image.png";

  return {
    title: `${business.name} | Book Online`,
    description:
      business.description ||
      `Book appointments at ${business.name}. Check available services, business hours, and secure your slot today.`,
    alternates: {
      canonical: `/${business.slug}`,
    },
    openGraph: {
      title: `Book with ${business.name} | Service Flow`,
      description:
        business.description ||
        `View services, check availability, and book your appointment with ${business.name} online.`,
      url: `/${business.slug}`,
      siteName: "Service Flow",
      locale: "en_PH",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: business.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${business.name} | Book Online`,
      description:
        business.description ||
        `Book appointments at ${business.name} with Service Flow.`,
      images: [imageUrl],
    },
  };
}

export default function FacingWebsitePage({ params }: Props) {
  return (
    <Suspense fallback={<BusinessFacingSkeleton />}>
      <FacingWebsiteContent params={params} />
    </Suspense>
  );
}

async function FacingWebsiteContent({ params }: Props) {
  await connection();
  const { businessSlug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      latitude: true,
      longitude: true,
      business_hours: true,
    },
  });

  if (!business) {
    notFound();
  }

  const now = new Date();
  const [services, saleEvents] = await Promise.all([
    prisma.service.findMany({
      where: { business_id: business.id },
      orderBy: [{ category: "asc" }, { price: "asc" }],
    }),
    prisma.saleEvent.findMany({
      where: {
        business_id: business.id,
        start_date: { lte: now },
        end_date: { gte: now },
      },
      orderBy: { start_date: "desc" },
      take: 4,
    }),
  ]);

  const generalHours = business.business_hours.filter(
    (hour) => hour.category === "GENERAL",
  );
  const hoursForSchema = generalHours.length
    ? generalHours
    : business.business_hours;

  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    url: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.serviceflow.store"}/${business.slug}`,
    image:
      business.imageUrl ||
      `${process.env.NEXT_PUBLIC_APP_URL || "https://www.serviceflow.store"}/og-image.png`,
    priceRange: "PHP",
    description: business.description || undefined,
    openingHoursSpecification: hoursForSchema.map((hour) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: dayOfWeekLabel(hour.day_of_week),
      opens: hour.open_time,
      closes: hour.close_time,
    })),
  };

  if (business.latitude && business.longitude) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: business.latitude,
      longitude: business.longitude,
    };
  }

  if (isBeautyFeelSlug(business.slug)) {
    jsonLd.sameAs = beautyFeelContent.socials.map((social) => social.href);
    return (
      <>
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <BeautyFeelLanding
          business={business}
          services={services}
          businessHours={business.business_hours}
          saleEvents={saleEvents}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold">{business.name}</h1>
        <p className="text-muted-foreground">
          This business is still preparing their public-facing website. You can
          book an appointment online now.
        </p>
        <Button asChild>
          <Link href={`/${business.slug}/booking`}>Book now</Link>
        </Button>
      </div>
    </div>
  );
}

function dayOfWeekLabel(index: number) {
  return [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][index];
}
