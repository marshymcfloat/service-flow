import { prisma } from "@/prisma/prisma";
import ServiceSelect from "./ServiceSelect";
import { unstable_cache } from "next/cache";

export default async function ServiceDataContainer({
  business_id,
}: {
  business_id: string;
}) {
  const getServices = unstable_cache(async () => {
    const services = await prisma.service.findMany({ where: { business_id } });
    return services;
  });

  const services = await getServices();

  return (
    <>
      <ServiceSelect services={services} />
    </>
  );
}
