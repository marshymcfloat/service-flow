"use server";

import { prisma } from "@/prisma/prisma";
import {
  AvailedServiceStatus,
  BookingStatus,
} from "@/prisma/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";

export async function getPendingServicesAction() {
  const auth = await requireAuth();
  if (!auth.success) return [];
  const { businessSlug } = auth;

  try {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      select: { id: true },
    });

    if (!business) return [];

    const pendingServices = await prisma.availedService.findMany({
      where: {
        booking: {
          business_id: business.id,
          status: { in: ["ACCEPTED"] },
        },
        status: AvailedServiceStatus.PENDING,
      },
      select: {
        id: true,
        price: true,
        scheduled_at: true,
        package_id: true,
        package: {
          select: {
            name: true,
          },
        },
        service: {
          select: {
            name: true,
            duration: true,
          },
        },
        booking: {
          select: {
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduled_at: "asc",
      },
    });

    return pendingServices;
  } catch (error) {
    console.error("Error fetching pending services:", error);
    return [];
  }
}

export async function claimServiceAction(
  serviceId: number,
  employeeId: number,
) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const result = await prisma.availedService.update({
      where: {
        id: serviceId,
        status: AvailedServiceStatus.PENDING,
        booking: { business: { slug: businessSlug } },
      },
      data: {
        status: AvailedServiceStatus.CLAIMED,
        served_by_id: employeeId,
        claimed_at: new Date(),
      },
    });

    revalidatePath(`/app/${businessSlug}`);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error claiming service:", error);
    return { success: false, error: "Service already claimed or not found." };
  }
}

export async function unclaimServiceAction(serviceId: number) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const result = await prisma.availedService.update({
      where: {
        id: serviceId,
        booking: { business: { slug: businessSlug } },
      },
      data: {
        status: AvailedServiceStatus.PENDING,
        served_by_id: null,
        claimed_at: null,
      },
    });

    revalidatePath(`/app/${businessSlug}`);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error unclaiming service:", error);
    return { success: false, error: "Unable to unclaim service." };
  }
}

export async function markServiceServedAction(
  serviceId: number,
  employeeId: number,
) {
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
    console.error("Error marking service as served:", error);
    return { success: false, error: "Unable to mark as served." };
  }
}

export async function unserveServiceAction(serviceId: number) {
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
    console.error("Error unserving service:", error);
    return { success: false, error: "Unable to unserve." };
  }
}

export async function updateBookingStatusAction(
  bookingId: number,
  status: BookingStatus,
) {
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
    return { success: false, error: "Failed to update status" };
  }
}

export async function deleteBookingAction(bookingId: number) {
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
    return { success: false, error: "Failed to delete" };
  }
}
