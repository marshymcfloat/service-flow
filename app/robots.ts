import { MetadataRoute } from "next";

const getBaseUrl = () => {
  const url =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.serviceflow.store";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
};

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/app/",
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
