"use server";

import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";

export async function searchCustomer(name: string, businessSlug: string) {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: "Unauthorized" };

  try {
    const customers = await prisma.customer.findMany({
      where: {
        name: {
          startsWith: name,
          mode: "insensitive",
        },
        business: {
          slug: businessSlug,
        },
      },
      take: 5,
    });

    return { success: true, data: customers };
  } catch (err) {
    return { success: false, error: "Failed to search customers" };
  }
}

export async function createCustomer(data: {
  businessSlug: string;
  name: string;
  email?: string;
  phone?: string;
}) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug }, // ensuring we use the session slug
    });

    if (!business) {
      return { success: false, error: "Business not found" };
    }

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        business_id: business.id,
      },
    });

    revalidatePath(`/app/${businessSlug}/customers`);
    return { success: true, data: customer };
  } catch (error) {
    console.error("Create customer error:", error);
    return { success: false, error: "Failed to create customer" };
  }
}

export async function updateCustomer(
  id: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    businessSlug: string;
  },
) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
      },
    });

    revalidatePath(`/app/${businessSlug}/customers`);
    return { success: true, data: customer };
  } catch (error) {
    console.error("Update customer error:", error);
    return { success: false, error: "Failed to update customer" };
  }
}

export async function deleteCustomer(id: string) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    await prisma.customer.delete({
      where: { id },
    });

    revalidatePath(`/app/${businessSlug}/customers`);
    return { success: true };
  } catch (error) {
    console.error("Delete customer error:", error);
    return { success: false, error: "Failed to delete customer" };
  }
}

type FlowDelayUnit = "DAYS" | "WEEKS" | "MONTHS";
type FlowType = "REQUIRED" | "SUGGESTED";

export type CustomerFlowStatus = {
  triggerServiceId: number;
  triggerServiceName: string;
  suggestedServiceId: number;
  suggestedServiceName: string;
  flowType: FlowType;
  status: "PENDING" | "COMPLETED";
  dueDate: Date;
  completedAt?: Date | null;
  lastServiceDate: Date;
  delayDuration: number;
  delayUnit: FlowDelayUnit;
};

export type CustomerBookingHistoryItem = {
  id: number;
  status: string;
  payment_method: string;
  scheduled_at: Date | null;
  estimated_end: Date | null;
  created_at: Date;
  grand_total: number;
  total_discount: number;
  downpayment: number | null;
  availed_services: {
    id: number;
    status: string;
    scheduled_at: Date | null;
    estimated_end: Date | null;
    final_price: number;
    service: { name: string } | null;
  }[];
};

export type CustomerHistoryData = {
  bookings: CustomerBookingHistoryItem[];
  nextAppointment: {
    bookingId: number;
    scheduledAt: Date;
    estimatedEnd: Date | null;
    services: string[];
  } | null;
  flowStatus: CustomerFlowStatus[];
};

const addFlowDelay = (
  base: Date,
  duration: number,
  unit: FlowDelayUnit,
) => {
  const dueDate = new Date(base);
  if (unit === "DAYS") {
    dueDate.setDate(dueDate.getDate() + duration);
  } else if (unit === "WEEKS") {
    dueDate.setDate(dueDate.getDate() + duration * 7);
  } else if (unit === "MONTHS") {
    dueDate.setMonth(dueDate.getMonth() + duration);
  }
  return dueDate;
};

export async function getCustomerHistory(
  customerId: string,
): Promise<
  | { success: true; data: CustomerHistoryData }
  | { success: false; error: string }
> {
  const auth = await requireAuth();
  if (!auth.success) return auth;

  const { businessSlug } = auth;

  try {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      select: { id: true },
    });

    if (!business) {
      return { success: false, error: "Business not found" };
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, business_id: business.id },
      select: { id: true },
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    const bookings = await prisma.booking.findMany({
      where: {
        customer_id: customerId,
        business_id: business.id,
      },
      orderBy: [{ scheduled_at: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        status: true,
        payment_method: true,
        scheduled_at: true,
        estimated_end: true,
        created_at: true,
        grand_total: true,
        total_discount: true,
        downpayment: true,
        availed_services: {
          orderBy: { scheduled_at: "asc" },
          select: {
            id: true,
            status: true,
            scheduled_at: true,
            estimated_end: true,
            final_price: true,
            service: { select: { name: true } },
          },
        },
      },
    });

    const nextBooking = await prisma.booking.findFirst({
      where: {
        customer_id: customerId,
        business_id: business.id,
        status: { not: "CANCELLED" },
        scheduled_at: { gt: new Date() },
      },
      orderBy: { scheduled_at: "asc" },
      select: {
        id: true,
        scheduled_at: true,
        estimated_end: true,
        availed_services: {
          select: { service: { select: { name: true } } },
        },
      },
    });

    const nextAppointment = nextBooking
      ? {
          bookingId: nextBooking.id,
          scheduledAt: nextBooking.scheduled_at!,
          estimatedEnd: nextBooking.estimated_end,
          services:
            nextBooking.availed_services
              ?.map((item) => item.service?.name)
              .filter(Boolean) || [],
        }
      : null;

    const availedServices = await prisma.availedService.findMany({
      where: {
        booking: {
          customer_id: customerId,
          business_id: business.id,
          status: { not: "CANCELLED" },
        },
      },
      orderBy: { created_at: "desc" },
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

    const serviceDatesMap = new Map<number, Date[]>();
    for (const availed of availedServices) {
      const date = availed.served_at || availed.created_at;
      const list = serviceDatesMap.get(availed.service_id) || [];
      list.push(date);
      serviceDatesMap.set(availed.service_id, list);
    }

    for (const list of serviceDatesMap.values()) {
      list.sort((a, b) => a.getTime() - b.getTime());
    }

    const flowStatus: CustomerFlowStatus[] = [];
    const seenFlows = new Set<string>();

    for (const availed of availedServices) {
      const triggers = availed.service.flow_triggers || [];
      if (triggers.length === 0) continue;

      for (const flow of triggers) {
        const key = `${flow.trigger_service_id}:${flow.suggested_service_id}`;
        if (seenFlows.has(key)) continue;
        seenFlows.add(key);

        const lastServiceDate = availed.served_at || availed.created_at;
        const dueDate = addFlowDelay(
          lastServiceDate,
          flow.delay_duration,
          flow.delay_unit as FlowDelayUnit,
        );

        const suggestedDates =
          serviceDatesMap.get(flow.suggested_service_id) || [];
        const completedAt =
          suggestedDates.find((d) => d >= lastServiceDate) || null;

        flowStatus.push({
          triggerServiceId: flow.trigger_service_id,
          triggerServiceName: availed.service.name,
          suggestedServiceId: flow.suggested_service_id,
          suggestedServiceName: flow.suggested_service.name,
          flowType: flow.type as FlowType,
          status: completedAt ? "COMPLETED" : "PENDING",
          dueDate,
          completedAt,
          lastServiceDate,
          delayDuration: flow.delay_duration,
          delayUnit: flow.delay_unit as FlowDelayUnit,
        });
      }
    }

    return {
      success: true,
      data: {
        bookings: bookings as CustomerBookingHistoryItem[],
        nextAppointment,
        flowStatus,
      },
    };
  } catch (error) {
    console.error("Get customer history error:", error);
    return { success: false, error: "Failed to fetch customer history" };
  }
}
