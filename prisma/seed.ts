import { hash } from "bcryptjs";
import { Role } from "./generated/prisma/client";
import { prisma } from "./prisma";

async function main() {
  console.log("Start seeding ...");

  // Clean up existing data
  await prisma.availedService.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.packageItem.deleteMany();
  await prisma.servicePackage.deleteMany();
  await prisma.service.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employeeAttendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.businessHours.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  const password = await hash("password123", 12);
  const employeePassword = await hash("employee123", 12);

  // ============================================
  // 1. BUSINESS: BEAUTY FEEL (Spa/Nails/Lashes)
  // ============================================
  console.log(" Creating BeautyFeel...");

  const bfOwnerUser = await prisma.user.create({
    data: {
      email: "owner@beautyfeel.com",
      name: "Maria Santos",
      hashed_password: password,
      role: Role.OWNER,
    },
  });

  const beautyFeel = await prisma.business.create({
    data: {
      name: "BeautyFeel",
      slug: "beautyfeel",
      initials: "BF",
      owners: { create: { user_id: bfOwnerUser.id } },
      latitude: 9.682940016270514,
      longitude: 118.75246245092016,
    } as any,
  });

  // BF Business Hours
  const days = Array.from({ length: 7 }, (_, i) => i);
  // General Hours (10-6)
  for (const d of days) {
    await prisma.businessHours.create({
      data: {
        business_id: beautyFeel.id,
        day_of_week: d,
        open_time: "10:00",
        close_time: "18:00",
        is_closed: d === 0, // Closed Sundays
        category: "GENERAL",
      },
    });

    // Special Spa Hours (Late night Fridays)
    await prisma.businessHours.create({
      data: {
        business_id: beautyFeel.id,
        day_of_week: d,
        open_time: "12:00",
        close_time: d === 5 ? "22:00" : "20:00", // Late on Friday
        is_closed: d === 0,
        category: "Spa",
      },
    });
  }

  // BF Services
  const bfServices = [
    { name: "Classic Manicure", price: 350, duration: 45, category: "Nails" },
    { name: "Gel Manicure", price: 550, duration: 60, category: "Nails" },
    { name: "Classic Pedicure", price: 450, duration: 60, category: "Nails" },
    { name: "Full Body Massage", price: 800, duration: 60, category: "Spa" },
    { name: "Deep Tissue", price: 1000, duration: 60, category: "Spa" },
    { name: "Classic Lashes", price: 1500, duration: 90, category: "Lashes" },
    { name: "Volume Lashes", price: 2000, duration: 120, category: "Lashes" },
  ];

  for (const s of bfServices) {
    await prisma.service.create({ data: { ...s, business_id: beautyFeel.id } });
  }

  // BF Employees
  const bfEmployees = [
    { name: "Anna Reyes", email: "anna@beautyfeel.com", specialties: [] },
    {
      name: "Joy Dela Cruz",
      email: "joy@beautyfeel.com",
      specialties: ["Nails"],
    },
    {
      name: "Bea Alonzo",
      email: "bea@beautyfeel.com",
      specialties: ["Lashes"],
    },
    {
      name: "Carla Abellana",
      email: "carla@beautyfeel.com",
      specialties: ["Spa"],
    },
    {
      name: "Dina Bonnevie",
      email: "dina@beautyfeel.com",
      specialties: ["Nails", "Lashes"],
    },
  ];

  for (const emp of bfEmployees) {
    const u = await prisma.user.create({
      data: {
        email: emp.email,
        name: emp.name,
        hashed_password: employeePassword,
        role: Role.EMPLOYEE,
      },
    });
    await prisma.employee.create({
      data: {
        user_id: u.id,
        business_id: beautyFeel.id,
        salary: 0,
        daily_rate: 500 + Math.random() * 200,
        commission_percentage: 10,
        specialties: emp.specialties,
      },
    });
  }

  // ============================================
  // 2. BUSINESS: GENTLEMAN'S CUT (Barber)
  // ============================================
  console.log(" Creating Gentleman's Cut...");

  const gcOwnerUser = await prisma.user.create({
    data: {
      email: "owner@gentlemanscut.com",
      name: "Arthur Shelby",
      hashed_password: password,
      role: Role.OWNER,
    },
  });

  const gentlemansCut = await prisma.business.create({
    data: {
      name: "Gentleman's Cut",
      slug: "gentlemans-cut",
      initials: "GC",
      owners: { create: { user_id: gcOwnerUser.id } },
      latitude: 9.7, // Approx
      longitude: 118.75, // Approx
    } as any,
  });

  // GC Business Hours (Early open)
  for (const d of days) {
    await prisma.businessHours.create({
      data: {
        business_id: gentlemansCut.id,
        day_of_week: d,
        open_time: "07:00",
        close_time: "19:00",
        is_closed: d === 6, // Closed Saturday
        category: "GENERAL",
      },
    });
  }

  // GC Services
  const gcServices = [
    { name: "Classic Cut", price: 300, duration: 30, category: "Haircut" },
    { name: "Fade", price: 400, duration: 45, category: "Haircut" },
    { name: "Hot Towel Shave", price: 350, duration: 30, category: "Shave" },
    { name: "Beard Trim", price: 200, duration: 20, category: "Grooming" },
    { name: "Hair Dye", price: 800, duration: 60, category: "Chemical" },
  ];

  for (const s of gcServices) {
    await prisma.service.create({
      data: { ...s, business_id: gentlemansCut.id },
    });
  }

  // GC Employees
  const gcEmployees = [
    {
      name: "Thomas Shelby",
      email: "thomas@gentlemanscut.com",
      specialties: ["Haircut", "Shave", "Grooming", "Chemical"],
    }, // Master
    {
      name: "John Shelby",
      email: "john@gentlemanscut.com",
      specialties: ["Haircut"],
    },
    {
      name: "Polly Gray",
      email: "polly@gentlemanscut.com",
      specialties: ["Chemical", "Haircut"],
    },
    {
      name: "Michael Gray",
      email: "michael@gentlemanscut.com",
      specialties: [],
    }, // Generalist
    {
      name: "Alfred Solomons",
      email: "alfie@gentlemanscut.com",
      specialties: ["Shave", "Grooming"],
    },
  ];

  for (const emp of gcEmployees) {
    const u = await prisma.user.create({
      data: {
        email: emp.email,
        name: emp.name,
        hashed_password: employeePassword,
        role: Role.EMPLOYEE,
      },
    });
    await prisma.employee.create({
      data: {
        user_id: u.id,
        business_id: gentlemansCut.id,
        salary: 0,
        daily_rate: 600 + Math.random() * 200,
        commission_percentage: 15,
        specialties: emp.specialties,
      },
    });
  }

  console.log("\n✅ Seeding finished successfully!");
  console.log("\n📋 Login Credentials:");
  console.log("--- BeautyFeel ---");
  console.log("   Owner: owner@beautyfeel.com / password123");
  console.log("   Emp (Generalist): anna@beautyfeel.com / employee123");
  console.log("   Emp (Nails): joy@beautyfeel.com / employee123");
  console.log("\n--- Gentleman's Cut ---");
  console.log("   Owner: owner@gentlemanscut.com / password123");
  console.log("   Emp (Master): thomas@gentlemanscut.com / employee123");
  console.log("   Emp (Haircut): john@gentlemanscut.com / employee123");
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
