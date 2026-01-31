"use server";

import { prisma } from "@/prisma/prisma";
import { requireAuth } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";

export type CreateVoucherInput = {
  code: string;
  type: "PERCENTAGE" | "FLAT";
  value: number;
  minimum_amount: number;
  expires_at: Date;
};

export async function getVouchersAction(businessSlug: string) {
  const auth = await requireAuth();
  if (!auth.success) return { success: false, error: "Unauthorized" };

  // Ensure user authorized for this business context
  if (auth.businessSlug !== businessSlug) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const vouchers = await prisma.voucher.findMany({
      where: {
        business: {
          slug: businessSlug,
        },
      },
      orderBy: {
        created_at: "desc",
      },
      include: {
        used_by: {
          select: {
            id: true,
            created_at: true,
          },
        },
      },
    });
    return { success: true, data: vouchers };
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    return { success: false, error: "Failed to fetch vouchers" };
  }
}

export async function createVoucherAction(data: CreateVoucherInput) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
    });

    if (!business) return { success: false, error: "Business not found" };

    const existing = await prisma.voucher.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return { success: false, error: "Voucher code already exists" };
    }

    const voucher = await prisma.voucher.create({
      data: {
        code: data.code,
        type: data.type,
        value: data.value,
        minimum_amount: data.minimum_amount,
        expires_at: data.expires_at,
        business_id: business.id,
        is_active: true,
      },
    });

    revalidatePath(`/app/${businessSlug}/vouchers`);
    return { success: true, data: voucher };
  } catch (error) {
    console.error("Error creating voucher:", error);
    return { success: false, error: "Failed to create voucher" };
  }
}

export async function deleteVoucherAction(id: number) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: { business: true },
    });

    if (!voucher || voucher.business.slug !== businessSlug) {
      return { success: false, error: "Voucher not found or unauthorized" };
    }

    await prisma.voucher.delete({
      where: { id },
    });

    revalidatePath(`/app/${businessSlug}/vouchers`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting voucher:", error);
    return { success: false, error: "Failed to delete voucher" };
  }
}

export async function generateVoucherCodeAction() {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
      select: { name: true, initials: true },
    });

    if (!business) return { success: false, error: "Business not found" };

    const prefix = business.initials || "VO";

    const randomChars = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    const code = `${prefix}-${randomChars}`;

    const existing = await prisma.voucher.findUnique({
      where: { code },
    });

    if (existing) {
      const randomChars2 = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      return { success: true, code: `${prefix}-${randomChars2}` };
    }

    return { success: true, code };
  } catch (error) {
    console.error("Error generating code:", error);
    return { success: false, error: "Failed to generate code" };
  }
}
