import { getSiteUrl } from "@/lib/site-url";

export function organizationSchema() {
  const baseUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Service Flow",
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    sameAs: [
      "https://twitter.com/serviceflow",
      "https://facebook.com/serviceflow",
      // Add other social links here
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+63-900-000-0000",
      contactType: "customer service",
      areaServed: "PH",
      availableLanguage: ["en", "fil"],
    },
  };
}

export function websiteSchema() {
  const baseUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Service Flow",
    url: baseUrl,
  };
}

export function breadcrumbSchema(items: { name: string; item: string }[]) {
  const baseUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item.startsWith("http") ? item.item : `${baseUrl}${item.item}`,
    })),
  };
}
