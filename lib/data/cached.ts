import { prisma } from "@/prisma/prisma";
import { cacheTag } from "next/cache";

export const tenantCacheTags = {
  businessBySlug: (slug: string) => `business:slug:${slug}`,
  businessHoursAndEmployees: (slug: string) =>
    `business:hours-employees:${slug}`,
  servicesByBusiness: (businessId: string) => `services:business:${businessId}`,
  packagesByBusiness: (businessId: string) => `packages:business:${businessId}`,
};

export async function getCachedBusinessBySlug(slug: string) {
  "use cache";
  cacheTag(tenantCacheTags.businessBySlug(slug));
  return prisma.business.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
}

export async function getCachedServices(businessId: string) {
  "use cache";
  cacheTag(tenantCacheTags.servicesByBusiness(businessId));
  return prisma.service.findMany({
    where: { business_id: businessId },
  });
}

export async function getCachedBusinessWithHoursAndEmployees(slug: string) {
  "use cache";
  cacheTag(tenantCacheTags.businessBySlug(slug));
  cacheTag(tenantCacheTags.businessHoursAndEmployees(slug));
  return prisma.business.findUnique({
    where: { slug },
    include: {
      business_hours: true,
      employees: {
        include: {
          user: {
            select: { name: true },
          },
        },
      },
      owners: {
        select: {
          id: true,
          user: {
            select: { name: true },
          },
          specialties: true,
        },
      },
    },
  });
}

export async function getCachedPackages(businessId: string) {
  "use cache";
  cacheTag(tenantCacheTags.packagesByBusiness(businessId));
  return prisma.servicePackage.findMany({
    where: { business_id: businessId },
    include: {
      items: {
        include: {
          service: true,
        },
      },
    },
  });
}
