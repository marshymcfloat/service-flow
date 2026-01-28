import { prisma } from "@/prisma/prisma";
import React from "react";

export default async function EmployeeServedHistory() {
  prisma.booking.findMany();
  return <div>EmployeeServedHistory</div>;
}
