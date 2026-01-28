import BookingForm from "@/components/bookings/BookingForm";
import { Modal } from "@/components/ui/modal";
import { Service } from "@/prisma/generated/prisma/client";
import { prisma } from "@/prisma/prisma";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next auth/options";

export default async function InterceptedBookingPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug: businessSlug },
  });

  if (!business) {
    return notFound();
  }

  // Check if current user is an employee of this business
  const session = await getServerSession(authOptions);
  let isEmployee = false;
  let currentEmployeeId: number | undefined;

  if (session?.user?.id) {
    const employee = await prisma.employee.findFirst({
      where: {
        user_id: session.user.id,
        business_id: business.id,
      },
    });
    isEmployee = !!employee;
    currentEmployeeId = employee?.id;
  }

  const getServices = unstable_cache(
    async () => {
      const services = await prisma.service.findMany({
        where: { business_id: business.id },
      });
      return services;
    },
    [`services-${business.id}`],
    {
      revalidate: 3600,
      tags: [`services-${business.id}`],
    },
  );

  const services = await getServices();

  const servicesByCategory = services.reduce<Record<string, Service[]>>(
    (acc, curr: Service) => {
      acc[curr.category] = [...(acc[curr.category] || []), curr];

      return acc;
    },
    {},
  );

  const categories = Object.keys(servicesByCategory);
  return (
    <Modal
      title={`Add Booking for ${business.name}`}
      description="Create a new booking directly from the dashboard."
    >
      <div className="p-1">
        <BookingForm
          services={services}
          categories={categories}
          isEmployee={isEmployee}
          currentEmployeeId={currentEmployeeId}
        />
      </div>
    </Modal>
  );
}
