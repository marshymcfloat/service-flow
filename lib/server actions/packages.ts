"use server";

import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

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
  try {
    const { items, ...packageData } = params;

    // Transaction to update package details and replace items
    const updatedPackage = await prisma.$transaction(async (tx) => {
      // 1. Update package basic info
      const pkg = await tx.servicePackage.update({
        where: { id: packageId },
        data: packageData,
        include: { business: true },
      });

      // 2. Delete existing items
      await tx.packageItem.deleteMany({
        where: { package_id: packageId },
      });

      // 3. Create new items
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
  try {
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
