import { prisma } from "@/prisma/prisma";
import { MetadataRoute } from "next";

const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return "https://www.serviceflow.store";

  return url.startsWith("http")
    ? url.replace(/\/$/, "")
    : `https://${url.replace(/\/$/, "")}`;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const businesses = await prisma.business.findMany({
    select: {
      slug: true,
      updated_at: true,
    },
  });

  const businessRoutes: MetadataRoute.Sitemap = businesses.map((business) => ({
    url: `${baseUrl}/${business.slug}`,
    lastModified: business.updated_at,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...businessRoutes];
}
