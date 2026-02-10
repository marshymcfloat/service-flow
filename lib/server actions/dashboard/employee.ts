"use server";

import { prisma } from "@/prisma/prisma";
import {
  AvailedServiceStatus,
  BookingStatus,
  ServiceProviderType,
} from "@/prisma/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";
import { getActiveSaleEvents } from "@/lib/server actions/sale-event";
import { getApplicableDiscount } from "@/lib/utils/pricing";
import {
  claimServiceSchema,
  serviceIdSchema,
  markServedSchema,
} from "@/lib/zod-schemas/dashboard";

export async function claimServiceAction(
  serviceId: number,
  employeeId: number,
) {
  const validation = claimServiceSchema.safeParse({ serviceId, employeeId });
  if (!validation.success) {
    return { success: false, error: "Invalid input" };
  }

  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    // Fetch service details for discount calculation
    const serviceToClaim = await prisma.availedService.findUnique({
      where: { id: serviceId },
      select: {
        price: true,
        service_id: true,
        package_id: true,
      },
    });

    if (!serviceToClaim) {
      return { success: false, error: "Service not found." };
    }

    const saleEventsResult = await getActiveSaleEvents(businessSlug);
    const saleEvents =
      (saleEventsResult.success && saleEventsResult.data) || [];

    const discountInfo = getApplicableDiscount(
      serviceToClaim.service_id,
      serviceToClaim.package_id ?? undefined,
      serviceToClaim.price,
      saleEvents,
    );

    const updateData = {
      status: AvailedServiceStatus.CLAIMED,
      served_by_id: employeeId,
      served_by_type: ServiceProviderType.EMPLOYEE,
      claimed_at: new Date(),
      ...(discountInfo
        ? {
            final_price: discountInfo.finalPrice,
            discount: discountInfo.discount,
            discount_reason: discountInfo.reason,
            commission_base: discountInfo.finalPrice,
          }
        : {
            final_price: serviceToClaim.price,
            discount: 0,
            discount_reason: null,
            commission_base: serviceToClaim.price,
          }),
    };

    const result = await prisma.availedService.update({
      where: {
        id: serviceId,
        status: AvailedServiceStatus.PENDING,
        booking: { business: { slug: businessSlug } },
      },
      data: updateData,
    });

    revalidatePath(`/app/${businessSlug}`);
    return { success: true, data: result };
  } catch (error) {
    const e = error as { code?: string };
    if (e.code === "P2025") {
      return { success: false, error: "Service already claimed or not found." };
    }
    console.error("Error claiming service:", error);
    return { success: false, error: "Service already claimed or not found." };
  }
}

export async function unclaimServiceAction(serviceId: number) {
  const validation = serviceIdSchema.safeParse({ serviceId });
  if (!validation.success) {
    return { success: false, error: "Invalid input" };
  }

  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    // Get original price to reset fields
    const service = await prisma.availedService.findUnique({
      where: { id: serviceId },
      select: { price: true },
    });

    if (!service) return { success: false, error: "Service not found" };

    const result = await prisma.availedService.update({
      where: {
        id: serviceId,
        booking: { business: { slug: businessSlug } },
      },
      data: {
        status: AvailedServiceStatus.PENDING,
        served_by_id: null,
        served_by_type: null,
        claimed_at: null,
        final_price: service.price,
        discount: 0,
        discount_reason: null,
        commission_base: service.price,
      },
    });

    revalidatePath(`/app/${businessSlug}`);
    return { success: true, data: result };
  } catch (error) {
    const e = error as { code?: string };
    if (e.code === "P2025") {
      return { success: false, error: "Unable to unclaim service." };
    }
    console.error("Error unclaiming service:", error);
    return { success: false, error: "Unable to unclaim service." };
  }
}

export async function markServiceServedAction(
  serviceId: number,
  employeeId: number,
) {
  const validation = markServedSchema.safeParse({ serviceId, employeeId });
  if (!validation.success) {
    return { success: false, error: "Invalid input" };
  }

  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const service = await tx.availedService.findUnique({
        where: {
          id: serviceId,
          booking: { business: { slug: businessSlug } },
        },
        select: {
          commission_base: true,
          price: true,
          booking_id: true,
        },
      });

      if (!service) throw new Error("Service not found");

      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { commission_percentage: true },
      });

      if (!employee) throw new Error("Employee not found");

      const baseAmount = service.commission_base ?? service.price;
      const commissionAmount =
        (baseAmount * employee.commission_percentage) / 100;

      await tx.employee.update({
        where: { id: employeeId },
        data: {
          salary: { increment: commissionAmount },
        },
      });

      const updatedService = await tx.availedService.update({
        where: {
          id: serviceId,
          served_by_id: employeeId,
        },
        data: {
          status: AvailedServiceStatus.COMPLETED,
          served_at: new Date(),
          completed_at: new Date(),
        },
      });

      const remainingUnserved = await tx.availedService.count({
        where: {
          booking_id: service.booking_id,
          status: {
            notIn: [
              AvailedServiceStatus.COMPLETED,
              AvailedServiceStatus.CANCELLED,
            ],
          },
        },
      });

      if (remainingUnserved === 0) {
        await tx.booking.update({
          where: { id: service.booking_id },
          data: { status: BookingStatus.COMPLETED },
        });
      }

      return updatedService;
    });

    revalidatePath(`/app/${businessSlug}`);
    return { success: true, data: result };
  } catch (error) {
    const e = error as { code?: string };
    if (e.code === "P2025") {
      return { success: false, error: "Unable to mark as served." };
    }
    console.error("Error marking service as served:", error);
    return { success: false, error: "Unable to mark as served." };
  }
}

export async function unserveServiceAction(serviceId: number) {
  const validation = serviceIdSchema.safeParse({ serviceId });
  if (!validation.success) {
    return { success: false, error: "Invalid input" };
  }

  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const service = await tx.availedService.findUnique({
        where: {
          id: serviceId,
          booking: { business: { slug: businessSlug } },
        },
        select: {
          commission_base: true,
          price: true,
          served_by_id: true,
          booking_id: true,
          booking: { select: { status: true } },
        },
      });

      if (!service || !service.served_by_id)
        throw new Error("Service not found or not served");

      const employee = await tx.employee.findUnique({
        where: { id: service.served_by_id },
        select: { commission_percentage: true },
      });

      if (!employee) throw new Error("Employee not found");

      const baseAmount = service.commission_base ?? service.price;
      const commissionAmount =
        (baseAmount * employee.commission_percentage) / 100;

      await tx.employee.update({
        where: { id: service.served_by_id },
        data: {
          salary: { decrement: commissionAmount },
        },
      });

      const updatedService = await tx.availedService.update({
        where: { id: serviceId },
        data: {
          status: AvailedServiceStatus.CLAIMED,
          served_at: null,
          completed_at: null,
        },
      });

      if (service.booking.status === BookingStatus.COMPLETED) {
        await tx.booking.update({
          where: { id: service.booking_id },
          data: { status: BookingStatus.ACCEPTED },
        });
      }

      return updatedService;
    });

    revalidatePath(`/app/${businessSlug}`);
    return { success: true, data: result };
  } catch (error) {
    const e = error as { code?: string };
    if (e.code === "P2025") {
      return { success: false, error: "Unable to unserve." };
    }
    console.error("Error unserving service:", error);
    return { success: false, error: "Unable to unserve." };
  }
}
