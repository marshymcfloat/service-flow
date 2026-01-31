"use server";

import { prisma } from "@/prisma/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { requireAuth } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";

// Get all employees for a business
export async function getEmployeesAction() {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const employees = await prisma.employee.findMany({
      where: {
        business: {
          slug: businessSlug,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            created_at: true,
            updated_at: true,
          },
        },
        attendance: {
          orderBy: { date: "desc" },
          take: 7,
        },
        payslips: {
          orderBy: { ending_date: "desc" },
          take: 1,
        },
        _count: {
          select: {
            served_services: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    return { success: true, data: employees };
  } catch (error) {
    console.error("Failed to get employees:", error);
    return { success: false, error: "Failed to fetch employees" };
  }
}

// Create a new employee (also creates a user account)
export async function createEmployeeAction(data: {
  name: string;
  email: string;
  password: string;
  daily_rate: number;
  commission_percentage: number;
}) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return { success: false, error: "Email already in use" };
    }

    const business = await prisma.business.findUnique({
      where: { slug: businessSlug },
    });

    if (!business) {
      return { success: false, error: "Business not found" };
    }

    // Hash password
    const hashedPassword = await hash(data.password, 12);

    // Create user and employee in a transaction
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.create({
          data: {
            name: data.name,
            email: data.email,
            hashed_password: hashedPassword,
            role: "EMPLOYEE",
          },
        });

        const employee = await tx.employee.create({
          data: {
            user_id: user.id,
            business_id: business.id,
            salary: 0, // Legacy field
            daily_rate: data.daily_rate,
            commission_percentage: data.commission_percentage,
          },
          include: {
            user: true,
          },
        });

        return employee;
      },
    );

    revalidatePath(`/app/${businessSlug}/employees`);
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to create employee:", error);
    return { success: false, error: "Failed to create employee" };
  }
}

// Update an employee
export async function updateEmployeeAction(
  employeeId: number,
  data: {
    name?: string;
    email?: string;
    daily_rate?: number;
    commission_percentage?: number;
  },
) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    // Update user and employee
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (data.name || data.email) {
        await tx.user.update({
          where: { id: employee.user_id },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.email && { email: data.email }),
          },
        });
      }

      await tx.employee.update({
        where: { id: employeeId },
        data: {
          ...(data.daily_rate !== undefined && { daily_rate: data.daily_rate }),
          ...(data.commission_percentage !== undefined && {
            commission_percentage: data.commission_percentage,
          }),
        },
      });
    });

    revalidatePath(`/app/${businessSlug}/employees`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update employee:", error);
    return { success: false, error: "Failed to update employee" };
  }
}

// Delete an employee
export async function deleteEmployeeAction(employeeId: number) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    // Delete employee (user is linked, decide if you want to delete user too)
    // For now, we'll delete the employee record only
    await prisma.employee.delete({
      where: { id: employeeId },
    });

    revalidatePath(`/app/${businessSlug}/employees`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete employee:", error);
    return { success: false, error: "Failed to delete employee" };
  }
}

// Reset employee password
export async function resetEmployeePasswordAction(
  employeeId: number,
  newPassword: string,
) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  const { businessSlug } = auth;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    const hashedPassword = await hash(newPassword, 12);

    await prisma.user.update({
      where: { id: employee.user_id },
      data: { hashed_password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to reset password:", error);
    return { success: false, error: "Failed to reset password" };
  }
}
