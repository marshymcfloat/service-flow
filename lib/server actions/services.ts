"use server";

import { prisma } from "@/prisma/prisma";
import { requireAuth } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";

// Get all services for a business
export async function getServicesAction() {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const services = await prisma.service.findMany({
      where: {
        business: {
          slug: businessSlug,
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return { success: true, data: services };
  } catch (error) {
    console.error("Failed to get services:", error);
    return { success: false, error: "Failed to fetch services" };
  }
}

// Create a new service
export async function createServiceAction(data: {
  name: string;
  description?: string;
  price: number;
  duration?: number;
  category: string;
}) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
    });

    if (!business) {
      return { success: false, error: "Business not found" };
    }

    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: data.description || null,
        price: data.price,
        duration: data.duration || null,
        category: data.category,
        business_id: business.id,
      },
    });

    revalidatePath(`/app/${session.user.businessSlug}/services`);
    return { success: true, data: service };
  } catch (error) {
    console.error("Failed to create service:", error);
    return { success: false, error: "Failed to create service" };
  }
}

// Update a service
export async function updateServiceAction(
  serviceId: number,
  data: {
    name?: string;
    description?: string;
    price?: number;
    duration?: number;
    category?: string;
  },
) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const service = await prisma.service.update({
      where: { id: serviceId },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
        category: data.category,
      },
    });

    revalidatePath(`/app/${session.user.businessSlug}/services`);
    return { success: true, data: service };
  } catch (error) {
    console.error("Failed to update service:", error);
    return { success: false, error: "Failed to update service" };
  }
}

// Delete a service
export async function deleteServiceAction(serviceId: number) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    await prisma.service.delete({
      where: { id: serviceId },
    });

    revalidatePath(`/app/${session.user.businessSlug}/services`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete service:", error);
    return { success: false, error: "Failed to delete service" };
  }
}

// Get unique categories
export async function getServiceCategoriesAction() {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const services = await prisma.service.findMany({
      where: {
        business: {
          slug: businessSlug,
        },
      },
      select: { category: true },
      distinct: ["category"],
    });

    const categories = services.map((s: { category: string }) => s.category);
    return { success: true, data: categories };
  } catch (error) {
    console.error("Failed to get categories:", error);
    return { success: false, error: "Failed to fetch categories" };
  }
}
