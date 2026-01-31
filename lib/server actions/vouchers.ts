"use server";

import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next auth/options";
import { revalidatePath } from "next/cache";

export type CreateVoucherInput = {
  code: string;
  type: "PERCENTAGE" | "FLAT";
  value: number;
  minimum_amount: number;
  expires_at: Date;
};

export async function getVouchersAction(businessSlug: string) {
  const session = await getServerSession(authOptions);

  // Basic security check - ensure user belongs to this business slug
  // In a real app we might want stricter checks (e.g. is Owner)
  if (
    !session?.user?.businessSlug ||
    session.user.businessSlug !== businessSlug
  ) {
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
  const session = await getServerSession(authOptions);

  if (!session?.user?.businessSlug) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const business = await prisma.business.findUnique({
      where: { slug: session.user.businessSlug },
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

    revalidatePath(`/app/${session.user.businessSlug}/vouchers`);
    return { success: true, data: voucher };
  } catch (error) {
    console.error("Error creating voucher:", error);
    return { success: false, error: "Failed to create voucher" };
  }
}

export async function deleteVoucherAction(id: number) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.businessSlug) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Verify ownership indirectly by checking if voucher belongs to business of user
    // Or just let the delete fail if ID doesn't exist.
    // Ideally we check if the voucher belongs to the session business.
    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: { business: true },
    });

    if (!voucher || voucher.business.slug !== session.user.businessSlug) {
      return { success: false, error: "Voucher not found or unauthorized" };
    }

    await prisma.voucher.delete({
      where: { id },
    });

    revalidatePath(`/app/${session.user.businessSlug}/vouchers`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting voucher:", error);
    return { success: false, error: "Failed to delete voucher" };
  }
}

export async function generateVoucherCodeAction() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.businessSlug) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const business = await prisma.business.findUnique({
      where: { slug: session.user.businessSlug },
      select: { name: true, initials: true },
    });

    if (!business) return { success: false, error: "Business not found" };

    const prefix = business.initials || "VO"; // Fallback just in case

    const randomChars = Math.random()
      .toString(36)
      .substring(2, 8) // 6 characters (2 to 8)
      .toUpperCase();
    const code = `${prefix}-${randomChars}`;

    // Check uniqueness just in case
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
