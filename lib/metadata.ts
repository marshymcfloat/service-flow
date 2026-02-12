import { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

// Define the default configuration
const defaultTitle = "Service Flow";
const defaultDescription =
  "The all-in-one platform for salons, barbershops, and spas. Manage appointments, staff, and payments with ease.";
const defaultUrl = getSiteUrl();

type MetadataProps = {
  title?: string;
  description?: string;
  image?: string;
  icons?: string;
  noIndex?: boolean;
  canonical?: string;
};

function normalizeCanonical(canonical: string) {
  if (canonical.startsWith("http://") || canonical.startsWith("https://")) {
    return canonical;
  }

  return canonical.startsWith("/") ? canonical : `/${canonical}`;
}

export function constructMetadata({
  title = defaultTitle,
  description = defaultDescription,
  image = "/og-image.png",
  icons = "/favicon.ico",
  noIndex = false,
  canonical = "/",
}: MetadataProps = {}): Metadata {
  const canonicalUrl = normalizeCanonical(canonical);

  return {
    title: {
      template: `%s | ${defaultTitle}`,
      default: title,
    },
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: defaultTitle,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_PH",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      creator: "@serviceflow",
    },
    icons,
    metadataBase: new URL(defaultUrl),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
    alternates: {
      canonical: canonicalUrl,
    },
  };
}
