import { hash } from "bcryptjs";
import { Role } from "./generated/prisma/client";
import { prisma } from "./prisma";

async function main() {
  console.log("Start seeding ...");

  await prisma.service.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  const password = await hash("password123", 12);

  const ownerUser = await prisma.user.create({
    data: {
      email: "owner@example.com",
      name: "John Owner",
      hashed_password: password,
      role: Role.OWNER,
    },
  });

  // 2. Create a Business owned by this user
  const business = await prisma.business.create({
    data: {
      name: "Acme Corp",
      slug: "acme-corp",
      owners: {
        create: {
          user_id: ownerUser.id,
        },
      },
      // Also add the owner as an employee? The schema allows it.
      // For now, adhering to strict request: 1 Owner, 1 Customer, 5 Services.
      // Usually an owner is also an employee/member, but let's stick to the generated Owner model relation.
    },
  });

  console.log(`Created business: ${business.name} (id: ${business.id})`);

  // 3. Create 5 Services for the business
  const servicesData = [
    { name: "Basic Consultation", price: 50.0, duration: 30 },
    { name: "Premium Consultation", price: 100.0, duration: 60 },
    { name: "Quick Fix", price: 75.0, duration: 45 },
    { name: "Deep Dive Analysis", price: 200.0, duration: 120 },
    { name: "Emergency Support", price: 150.0, duration: 60 },
  ];

  for (const s of servicesData) {
    await prisma.service.create({
      data: {
        ...s,
        business_id: business.id,
      },
    });
  }
  console.log(`Created 5 services for ${business.name}`);

  // 4. Create a Customer User
  // 4. Create a Customer record (linked to Business, no User account)
  const customer = await prisma.customer.create({
    data: {
      name: "Alice Customer",
      email: "customer@example.com",
      phone: "555-0100",
      business_id: business.id,
    },
  });

  console.log(`Created customer: ${customer.name} (id: ${customer.id})`);

  console.log("Seeding finished.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
