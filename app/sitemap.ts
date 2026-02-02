import { prisma } from "@/prisma/prisma";
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://service-flow.vercel.app";

  // 1. Static Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${baseUrl}/auth/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/auth/register`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  // 2. Dynamic Routes: Business Pages
  // Fetch all businesses with their slugs
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
