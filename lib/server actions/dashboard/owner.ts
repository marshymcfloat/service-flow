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
  serviceIdSchema,
  updateBookingStatusSchema,
  bookingIdSchema,
} from "@/lib/zod-schemas/dashboard";

export async function claimServiceAsOwnerAction(serviceId: number) {
  const validation = serviceIdSchema.safeParse({ serviceId });
  if (!validation.success) {
    return { success: false, error: "Invalid input" };
  }

  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug, session } = auth;

  if (session?.user?.role !== "OWNER") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const owner = await prisma.owner.findFirst({
      where: {
        user_id: session.user.id,
        business: { slug: businessSlug },
      },
      select: { id: true },
    });

    if (!owner) {
      return { success: false, error: "Owner not found" };
    }

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
      served_by_owner_id: owner.id,
      served_by_id: null,
      served_by_type: ServiceProviderType.OWNER,
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

    const result = await prisma.availedService.updateMany({
      where: {
        id: serviceId,
        status: AvailedServiceStatus.PENDING,
        booking: { business: { slug: businessSlug } },
      },
      data: updateData,
    });

    if (result.count === 0) {
      return { success: false, error: "Service already claimed or not found." };
    }

    revalidatePath(`/app/${businessSlug}`);
    return { success: true };
  } catch (error) {
    const e = error as { code?: string };
    if (e.code === "P2025") {
      return { success: false, error: "Service already claimed or not found." };
    }
    console.error("Error claiming service as owner:", error);
    return { success: false, error: "Unable to claim service." };
  }
}

export async function unclaimServiceAsOwnerAction(serviceId: number) {
  const validation = serviceIdSchema.safeParse({ serviceId });
  if (!validation.success) {
    return { success: false, error: "Invalid input" };
  }

  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug, session } = auth;

  if (session?.user?.role !== "OWNER") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const owner = await prisma.owner.findFirst({
      where: {
        user_id: session.user.id,
        business: { slug: businessSlug },
      },
      select: { id: true },
    });

    if (!owner) {
      return { success: false, error: "Owner not found" };
    }

    // Get original price via findUnique before updateMany
    const service = await prisma.availedService.findUnique({
      where: { id: serviceId },
      select: { price: true },
    });

    if (!service) {
      return { success: false, error: "Service not found." };
    }

    const result = await prisma.availedService.updateMany({
      where: {
        id: serviceId,
        served_by_owner_id: owner.id,
        booking: { business: { slug: businessSlug } },
      },
      data: {
        status: AvailedServiceStatus.PENDING,
        served_by_owner_id: null,
        served_by_type: null,
        claimed_at: null,
        final_price: service.price,
        discount: 0,
        discount_reason: null,
        commission_base: service.price,
      },
    });

    if (result.count === 0) {
      return { success: false, error: "Unable to unclaim service." };
    }

    revalidatePath(`/app/${businessSlug}`);
    return { success: true };
  } catch (error) {
    const e = error as { code?: string };
    if (e.code === "P2025") {
      return { success: false, error: "Unable to unclaim service." };
    }
    console.error("Error unclaiming service as owner:", error);
    return { success: false, error: "Unable to unclaim service." };
  }
}

export async function markServiceServedAsOwnerAction(serviceId: number) {
  const validation = serviceIdSchema.safeParse({ serviceId });
  if (!validation.success) {
    return { success: false, error: "Invalid input" };
  }

  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug, session } = auth;

  if (session?.user?.role !== "OWNER") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const owner = await prisma.owner.findFirst({
      where: {
        user_id: session.user.id,
        business: { slug: businessSlug },
      },
      select: { id: true },
    });

    if (!owner) {
      return { success: false, error: "Owner not found" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const service = await tx.availedService.findUnique({
        where: {
          id: serviceId,
        },
        select: {
          booking_id: true,
          served_by_owner_id: true,
        },
      });

      if (!service || service.served_by_owner_id !== owner.id) {
        throw new Error("Service not found or not claimed by owner");
      }

      const updatedService = await tx.availedService.update({
        where: {
          id: serviceId,
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
    console.error("Error marking service as served (owner):", error);
    return { success: false, error: "Unable to mark as served." };
  }
}

export async function unserveServiceAsOwnerAction(serviceId: number) {
  const validation = serviceIdSchema.safeParse({ serviceId });
  if (!validation.success) {
    return { success: false, error: "Invalid input" };
  }

  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug, session } = auth;

  if (session?.user?.role !== "OWNER") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const owner = await prisma.owner.findFirst({
      where: {
        user_id: session.user.id,
        business: { slug: businessSlug },
      },
      select: { id: true },
    });

    if (!owner) {
      return { success: false, error: "Owner not found" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const service = await tx.availedService.findUnique({
        where: {
          id: serviceId,
        },
        select: {
          booking_id: true,
          served_by_owner_id: true,
          booking: { select: { status: true } },
        },
      });

      if (!service || service.served_by_owner_id !== owner.id) {
        throw new Error("Service not found or not served by owner");
      }

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
    console.error("Error unserving service (owner):", error);
    return { success: false, error: "Unable to unserve." };
  }
}

export async function updateBookingStatusAction(
  bookingId: number,
  status: BookingStatus,
) {
  const validation = updateBookingStatusSchema.safeParse({ bookingId, status });
  if (!validation.success) {
    return { success: false, error: "Invalid input" };
  }

  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    await prisma.booking.update({
      where: {
        id: bookingId,
        business: { slug: businessSlug },
      },
      data: { status },
    });
    revalidatePath(`/app/${businessSlug}`);
    return { success: true };
  } catch (error) {
    const e = error as { code?: string };
    if (e.code === "P2025") {
      return { success: false, error: "Failed to update status." };
    }
    return { success: false, error: "Failed to update status" };
  }
}

export async function deleteBookingAction(bookingId: number) {
  const validation = bookingIdSchema.safeParse({ bookingId });
  if (!validation.success) {
    return { success: false, error: "Invalid input" };
  }

  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { session } = auth;

  if (session?.user?.role !== "OWNER") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.booking.delete({
      where: {
        id: bookingId,
        business: { slug: auth.businessSlug },
      },
    });
    revalidatePath(`/app/${auth.businessSlug}`);
    return { success: true };
  } catch (error) {
    const e = error as { code?: string };
    if (e.code === "P2025") {
      return { success: false, error: "Failed to delete." };
    }
    return { success: false, error: "Failed to delete" };
  }
}
