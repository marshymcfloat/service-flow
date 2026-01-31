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
