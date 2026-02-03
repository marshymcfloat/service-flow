"use server";

import { DiscountType } from "@/prisma/generated/prisma/enums";
import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

export type CreateSaleEventParams = {
  businessSlug: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  discountType: DiscountType;
  discountValue: number;
  serviceIds: number[];
  packageIds: number[];
};

export async function getSaleEvents(businessSlug: string) {
  try {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
    });

    if (!business) {
      throw new Error("Business not found");
    }

    const saleEvents = await prisma.saleEvent.findMany({
      where: { business_id: business.id },
      include: {
        applicable_services: true,
        applicable_packages: true,
      },
      orderBy: { created_at: "desc" },
    });

    return { success: true, data: saleEvents };
  } catch (error) {
    console.error("Error fetching sale events:", error);
    return { success: false, error: "Failed to fetch sale events" };
  }
}

export async function createSaleEvent(params: CreateSaleEventParams) {
  try {
    const business = await prisma.business.findUnique({
      where: { slug: params.businessSlug },
    });

    if (!business) {
      throw new Error("Business not found");
    }

    await prisma.saleEvent.create({
      data: {
        title: params.title,
        description: params.description,
        start_date: params.startDate,
        end_date: params.endDate,
        discount_type: params.discountType,
        discount_value: params.discountValue,
        business_id: business.id,
        applicable_services: {
          connect: params.serviceIds.map((id) => ({ id })),
        },
        applicable_packages: {
          connect: params.packageIds.map((id) => ({ id })),
        },
      },
    });

    revalidatePath(`/app/${params.businessSlug}/sale-events`);
    return { success: true };
  } catch (error) {
    console.error("Error creating sale event:", error);
    return { success: false, error: "Failed to create sale event" };
  }
}

export async function getActiveSaleEvents(businessSlug: string) {
  try {
    const now = new Date();
    const saleEvents = await prisma.saleEvent.findMany({
      where: {
        business: { slug: businessSlug },
        start_date: { lte: now },
        end_date: { gte: now },
      },
      include: {
        applicable_services: { select: { id: true } },
        applicable_packages: { select: { id: true } },
      },
    });
    return { success: true, data: saleEvents };
  } catch (error) {
    console.error("Error fetching active sale events:", error);
    return { success: false, error: "Failed to fetch active sale events" };
  }
}

export async function deleteSaleEvent(id: number, businessSlug: string) {
  try {
    await prisma.saleEvent.delete({
      where: { id },
    });

    revalidatePath(`/app/${businessSlug}/sale-events`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting sale event:", error);
    return { success: false, error: "Failed to delete sale event" };
  }
}
