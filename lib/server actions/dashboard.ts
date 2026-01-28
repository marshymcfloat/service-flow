"use server";

import { prisma } from "@/prisma/prisma";
import { AvailedServiceStatus } from "@/prisma/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function getPendingServicesAction(businessSlug: string) {
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
        },
        status: AvailedServiceStatus.PENDING,
      },
      select: {
        id: true,
        price: true,
        scheduled_at: true,
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
  try {
    const result = await prisma.availedService.update({
      where: {
        id: serviceId,
        status: AvailedServiceStatus.PENDING,
      },
      data: {
        status: AvailedServiceStatus.CLAIMED,
        served_by_id: employeeId,
        claimed_at: new Date(),
      },
    });

    revalidatePath("/[businessSlug]");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error claiming service:", error);
    return { success: false, error: "Service already claimed or not found." };
  }
}

export async function markServiceServedAction(
  serviceId: number,
  employeeId: number,
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the service and employee details
      const service = await tx.availedService.findUnique({
        where: { id: serviceId },
        select: { commission_base: true, price: true },
      });

      if (!service) throw new Error("Service not found");

      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { commission_percentage: true },
      });

      if (!employee) throw new Error("Employee not found");

      // 2. Calculate commission
      // If commission_base is present use it, otherwise fallback to price (though base should be there)
      const baseAmount = service.commission_base ?? service.price;
      const commissionAmount =
        (baseAmount * employee.commission_percentage) / 100;

      // 3. Update employee salary
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          salary: { increment: commissionAmount },
        },
      });

      // 4. Update service status
      return await tx.availedService.update({
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
    });

    revalidatePath("/[businessSlug]");
    return { success: true, data: result };
  } catch (error) {
    console.error("Error marking service as served:", error);
    return { success: false, error: "Unable to mark as served." };
  }
}
