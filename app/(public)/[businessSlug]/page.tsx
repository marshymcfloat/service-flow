import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { connection } from "next/server";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";

interface Props {
  params: Promise<{
    businessSlug: string;
  }>;
}

const getBusinessMetadata = unstable_cache(
  async (slug: string) => {
    return prisma.business.findUnique({
      where: { slug },
      select: { name: true, slug: true },
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

  return {
    title: business.name,
    description: `Book appointments and services at ${business.name}.`,
    openGraph: {
      title: `${business.name} | Service Flow`,
      description: `Book your next appointment at ${business.name}. Powered by Service Flow.`,
      url: `/${business.slug}`,
      siteName: "Service Flow",
      locale: "en_PH",
      type: "website",
    },
  };
}

export default function FacingWebsitePage({ params }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <Suspense
        fallback={<div className="text-muted-foreground">Loading...</div>}
      >
        <BusinessContent params={params} />
      </Suspense>
    </div>
  );
}

async function BusinessContent({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  await connection();
  const { businessSlug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    include: {
      business_hours: true,
    },
  });

  if (!business) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    url: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.serviceflow.store"}/${business.slug}`,
    telephone: "",
    address: {
      "@type": "PostalAddress",
      streetAddress: "",
      addressLocality: "",
      addressRegion: "",
      addressCountry: "PH",
    },
    geo:
      business.latitude && business.longitude
        ? {
            "@type": "GeoCoordinates",
            latitude: business.latitude,
            longitude: business.longitude,
          }
        : undefined,
    openingHoursSpecification: business.business_hours.map((hour: any) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ][hour.day_of_week],
      opens: hour.open_time,
      closes: hour.close_time,
    })),
  };

  return (
    <>
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="text-4xl font-bold mb-4">{business.name}</h1>
      <p className="text-lg text-muted-foreground">
        Public booking page coming soon...
      </p>
    </>
  );
}
