import { prisma } from "@/prisma/prisma";

export async function getCachedBusinessBySlug(slug: string) {
  "use cache";
  return prisma.business.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
}

export async function getCachedServices(businessId: string) {
  "use cache";
  return prisma.service.findMany({
    where: { business_id: businessId },
  });
}

export async function getCachedBusinessWithHoursAndEmployees(slug: string) {
  "use cache";
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
    },
  });
}
