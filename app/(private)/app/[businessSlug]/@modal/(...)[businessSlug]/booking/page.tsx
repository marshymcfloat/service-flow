import BookingForm from "@/components/bookings/BookingForm";
import { Modal } from "@/components/ui/modal";
import { Service } from "@/prisma/generated/prisma/client";
import { prisma } from "@/prisma/prisma";
import { notFound } from "next/navigation";
import { getCachedBusinessBySlug, getCachedServices } from "@/lib/data/cached";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next auth/options";

import { Suspense } from "react";

async function InterceptedBookingContent({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;

  const business = await getCachedBusinessBySlug(businessSlug);

  if (!business) {
    return notFound();
  }

  const session = await getServerSession(authOptions);
  let isStaff = false;
  let currentEmployeeId: number | undefined;

  if (session?.user?.id) {
    const employee = await prisma.employee.findFirst({
      where: {
        user_id: session.user.id,
        business_id: business.id,
      },
    });

    if (employee) {
      isStaff = true;
      currentEmployeeId = employee.id;
    } else {
      const owner = await prisma.owner.findFirst({
        where: {
          user_id: session.user.id,
          business_id: business.id,
        },
      });
      isStaff = !!owner;
    }
  }

  const services = await getCachedServices(business.id);

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
          isEmployee={isStaff}
          currentEmployeeId={currentEmployeeId}
          isModal={true}
        />
      </div>
    </Modal>
  );
}

export default async function InterceptedBookingPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  await params;
  return (
    <Suspense
      fallback={
        <Modal title="Loading..." description="Please wait...">
          <div className="h-96 w-full flex items-center justify-center">
            Loading...
          </div>
        </Modal>
      }
    >
      <InterceptedBookingContent params={params} />
    </Suspense>
  );
}
