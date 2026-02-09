export function organizationSchema() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.serviceflow.store";
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
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.serviceflow.store";
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Service Flow",
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: { name: string; item: string }[]) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.serviceflow.store";
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
