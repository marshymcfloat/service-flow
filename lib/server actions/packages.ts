"use server";

import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

interface CreatePackageParams {
  name: string;
  description?: string;
  price: number;
  duration?: number;
  category: string;
  businessSlug: string;
  serviceIds: number[];
}

interface UpdatePackageParams {
  name: string;
  description?: string;
  price: number;
  duration?: number;
  category: string;
  serviceIds: number[];
}

export async function createPackageAction(params: CreatePackageParams) {
  try {
    const business = await prisma.business.findUnique({
      where: { slug: params.businessSlug },
    });

    if (!business) {
      return { success: false, error: "Business not found" };
    }

    const { serviceIds, businessSlug, ...packageData } = params;

    const newPackage = await prisma.servicePackage.create({
      data: {
        ...packageData,
        business_id: business.id,
        services: {
          connect: serviceIds.map((id) => ({ id })),
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
    const { serviceIds, ...packageData } = params;

    const updatedPackage = await prisma.servicePackage.update({
      where: { id: packageId },
      data: {
        ...packageData,
        services: {
          set: serviceIds.map((id) => ({ id })), // Update relationships
        },
      },
      include: { business: true },
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
