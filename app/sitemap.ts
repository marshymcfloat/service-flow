import { prisma } from "@/prisma/prisma";
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.serviceflow.store";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
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
