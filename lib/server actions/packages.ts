"use server";

import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guards";

interface PackageItemInput {
  serviceId: number;
  customPrice: number;
}

interface CreatePackageParams {
  name: string;
  description?: string;
  price: number;
  duration?: number;
  category: string;
  businessSlug: string;
  items: PackageItemInput[];
}

interface UpdatePackageParams {
  name: string;
  description?: string;
  price: number;
  duration?: number;
  category: string;
  items: PackageItemInput[];
}

export async function createPackageAction(params: CreatePackageParams) {
  const auth = await requireAuth({ write: true });
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  if (params.businessSlug !== businessSlug) {
    return {
      success: false,
      error: "Unauthorized operation for this business.",
    };
  }

  try {
    const business = await prisma.business.findUnique({
      where: { slug: params.businessSlug },
    });

    if (!business) {
      return { success: false, error: "Business not found" };
    }

    const { items, businessSlug, ...packageData } = params;

    const newPackage = await prisma.servicePackage.create({
      data: {
        ...packageData,
        business_id: business.id,
        items: {
          create: items.map((item) => ({
            service_id: item.serviceId,
            custom_price: item.customPrice,
          })),
        },
      },
    });

    revalidatePath(`/app/${businessSlug}/packages`);
    return { success: true, data: newPackage };
  } catch (error) {
    console.error("Error creating package:", error);
    return { success: false, error: "Failed to create package" };
  }
}

export async function updatePackageAction(
  packageId: number,
  params: UpdatePackageParams,
) {
  const auth = await requireAuth({ write: true });
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const existingPackage = await prisma.servicePackage.findUnique({
      where: { id: packageId },
      select: { business: { select: { slug: true } } },
    });

    if (!existingPackage || existingPackage.business.slug !== businessSlug) {
      return { success: false, error: "Package not found or unauthorized" };
    }

    const { items, ...packageData } = params;

    const updatedPackage = await prisma.$transaction(async (tx) => {
      const pkg = await tx.servicePackage.update({
        where: { id: packageId },
        data: packageData,
        include: { business: true },
      });

      await tx.packageItem.deleteMany({
        where: { package_id: packageId },
      });

      if (items.length > 0) {
        await tx.packageItem.createMany({
          data: items.map((item) => ({
            package_id: packageId,
            service_id: item.serviceId,
            custom_price: item.customPrice,
          })),
        });
      }

      return pkg;
    });

    revalidatePath(`/app/${updatedPackage.business.slug}/packages`);
    return { success: true, data: updatedPackage };
  } catch (error) {
    console.error("Error updating package:", error);
    return { success: false, error: "Failed to update package" };
  }
}

export async function deletePackageAction(packageId: number) {
  const auth = await requireAuth({ write: true });
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    // Verify ownership
    const existingPackage = await prisma.servicePackage.findUnique({
      where: { id: packageId },
      select: { business: { select: { slug: true } } },
    });

    if (!existingPackage || existingPackage.business.slug !== businessSlug) {
      return { success: false, error: "Package not found or unauthorized" };
    }

    const deletedPackage = await prisma.servicePackage.delete({
      where: { id: packageId },
      include: { business: true },
    });

    revalidatePath(`/app/${deletedPackage.business.slug}/packages`);
    return { success: true, data: deletedPackage };
  } catch (error) {
    console.error("Error deleting package:", error);
    return { success: false, error: "Failed to delete package" };
  }
}
