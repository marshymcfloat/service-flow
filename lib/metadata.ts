import { Metadata } from "next";

// Define the default configuration
// TODO: Replace with your actual domain and deployment URL
const defaultTitle = "Service Flow";
const defaultDescription =
  "The all-in-one platform for salons, barbershops, and spas. Manage appointments, staff, and payments with ease.";
const defaultUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://www.serviceflow.store";

type MetadataProps = {
  title?: string;
  description?: string;
  image?: string;
  icons?: string;
  noIndex?: boolean;
};

export function constructMetadata({
  title = defaultTitle,
  description = defaultDescription,
  image = "/og-image.png",
  icons = "/favicon.ico",
  noIndex = false,
}: MetadataProps = {}): Metadata {
  return {
    title: {
      template: `%s | ${defaultTitle}`,
      default: title,
    },
    description,
    openGraph: {
      title,
      description,
      url: defaultUrl,
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
      canonical: "./",
    },
  };
}
