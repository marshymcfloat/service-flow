"use server";

import { prisma } from "@/prisma/prisma";

export interface BusinessHourInput {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  category: string;
}

export async function getBusinessHours(businessSlug: string) {
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    include: {
      business_hours: {
        orderBy: { day_of_week: "asc" },
      },
    },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  return business.business_hours;
}

export async function updateBusinessHours(
  businessSlug: string,
  hours: BusinessHourInput[],
) {
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  // Use a transaction to ensure consistency
  await prisma.$transaction(async (tx) => {
    // Upsert each hour entry
    for (const hour of hours) {
      await tx.businessHours.upsert({
        where: {
          business_id_day_of_week_category: {
            business_id: business.id,
            day_of_week: hour.day_of_week,
            category: hour.category,
          },
        },
        update: {
          open_time: hour.open_time,
          close_time: hour.close_time,
          is_closed: hour.is_closed,
        },
        create: {
          business_id: business.id,
          day_of_week: hour.day_of_week,
          open_time: hour.open_time,
          close_time: hour.close_time,
          is_closed: hour.is_closed,
          category: hour.category,
        },
      });
    }
  });

  return { success: true };
}

export async function getServiceCategories(businessSlug: string) {
  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
    include: {
      services: {
        select: {
          category: true,
        },
        distinct: ["category"],
      },
    },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  return business.services.map((s) => s.category);
}
