"use server";

import { prisma } from "@/prisma/prisma";

export type PendingFlow = {
  triggerServiceId: number;
  triggerServiceName: string;
  suggestedServiceId: number;
  suggestedServiceName: string;
  suggestedServicePrice: number;
  suggestedServiceDuration: number | null;
  suggestedServiceIdString: string; // for easier comparisons
  dueDate: Date;
  flowType: "REQUIRED" | "SUGGESTED";
  delayDuration: number;
  delayUnit: "DAYS" | "WEEKS" | "MONTHS";
  lastServiceDate: Date;
};

export async function getCustomerPendingFlows(
  customerId: string,
): Promise<PendingFlow[]> {
  if (!customerId) return [];

  try {
    // 1. Get the customer's last completed bookings/services
    const lastAvailedServices = await prisma.availedService.findMany({
      where: {
        booking: {
          customer_id: customerId,
          status: { not: "CANCELLED" },
        },
      },
      orderBy: {
        created_at: "desc", // Most recent first
      },
      take: 5, // Check the last few services
      include: {
        service: {
          include: {
            flow_triggers: {
              include: {
                suggested_service: true,
              },
            },
          },
        },
      },
    });

    const pendingFlows: PendingFlow[] = [];

    // 2. Iterate through services and check for active flows
    for (const availed of lastAvailedServices) {
      if (
        !availed.service.flow_triggers ||
        availed.service.flow_triggers.length === 0
      ) {
        continue;
      }

      for (const flow of availed.service.flow_triggers) {
        // Calculate when the next service should be
        const lastDate = availed.served_at || availed.created_at;
        const dueDate = new Date(lastDate);

        if (flow.delay_unit === "DAYS") {
          dueDate.setDate(dueDate.getDate() + flow.delay_duration);
        } else if (flow.delay_unit === "WEEKS") {
          dueDate.setDate(dueDate.getDate() + flow.delay_duration * 7);
        } else if (flow.delay_unit === "MONTHS") {
          dueDate.setMonth(dueDate.getMonth() + flow.delay_duration);
        }

        // Check if the customer has ALREADY booked this suggested service AFTER the trigger service
        const alreadyBooked = await prisma.availedService.findFirst({
          where: {
            booking: {
              customer_id: customerId,
            },
            service_id: flow.suggested_service_id,
            created_at: {
              gte: lastDate, // Must be booked AFTER the trigger service
            },
          },
        });

        if (!alreadyBooked) {
          pendingFlows.push({
            triggerServiceId: flow.trigger_service_id,
            triggerServiceName: availed.service.name,
            suggestedServiceId: flow.suggested_service_id,
            suggestedServiceName: flow.suggested_service.name,
            suggestedServicePrice: flow.suggested_service.price,
            suggestedServiceDuration: flow.suggested_service.duration,
            suggestedServiceIdString: flow.suggested_service_id.toString(),
            dueDate: dueDate,
            flowType: flow.type,
            delayDuration: flow.delay_duration,
            delayUnit: flow.delay_unit,
            lastServiceDate: lastDate,
          });
        }
      }
    }

    // Return unique suggestions (in case multiple past services trigger the same next step, take the latest one)
    // For now, simpler is better: return all unique by suggestedServiceId
    const uniqueFlows = pendingFlows.filter(
      (flow, index, self) =>
        index ===
        self.findIndex((t) => t.suggestedServiceId === flow.suggestedServiceId),
    );

    return uniqueFlows;
  } catch (error) {
    console.error("Failed to fetch pending flows:", error);
    return [];
  }
}
