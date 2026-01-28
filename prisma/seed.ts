import { hash } from "bcryptjs";
import { Role } from "./generated/prisma/client";
import { prisma } from "./prisma";

async function main() {
  console.log("Start seeding ...");

  // Clean up existing data
  await prisma.availedService.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.servicePackage.deleteMany();
  await prisma.service.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.businessHours.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  const password = await hash("password123", 12);

  // Create Owner User
  const ownerUser = await prisma.user.create({
    data: {
      email: "owner@beautyfeel.com",
      name: "Maria Santos",
      hashed_password: password,
      role: Role.OWNER,
    },
  });

  // Create Business: BeautyFeel
  const business = await prisma.business.create({
    data: {
      name: "BeautyFeel",
      slug: "beautyfeel",
      owners: {
        create: {
          user_id: ownerUser.id,
        },
      },
    },
  });

  console.log(`Created business: ${business.name} (slug: ${business.slug})`);

  // Create Business Hours
  const businessHours = [
    {
      day_of_week: 0,
      open_time: "10:00",
      close_time: "18:00",
      is_closed: false,
    }, // Sunday
    {
      day_of_week: 1,
      open_time: "09:00",
      close_time: "20:00",
      is_closed: false,
    }, // Monday
    {
      day_of_week: 2,
      open_time: "09:00",
      close_time: "20:00",
      is_closed: false,
    }, // Tuesday
    {
      day_of_week: 3,
      open_time: "09:00",
      close_time: "20:00",
      is_closed: false,
    }, // Wednesday
    {
      day_of_week: 4,
      open_time: "09:00",
      close_time: "20:00",
      is_closed: false,
    }, // Thursday
    {
      day_of_week: 5,
      open_time: "09:00",
      close_time: "21:00",
      is_closed: false,
    }, // Friday
    {
      day_of_week: 6,
      open_time: "09:00",
      close_time: "21:00",
      is_closed: false,
    }, // Saturday
  ];

  for (const hours of businessHours) {
    await prisma.businessHours.create({
      data: {
        ...hours,
        business_id: business.id,
      },
    });
  }
  console.log(`Created business hours for ${business.name}`);

  // Create Services - NAILS Category
  const nailServices = [
    {
      name: "Classic Manicure",
      description: "Traditional nail care with polish",
      price: 350,
      duration: 45,
      category: "Nails",
    },
    {
      name: "Gel Manicure",
      description: "Long-lasting gel polish manicure",
      price: 550,
      duration: 60,
      category: "Nails",
    },
    {
      name: "Classic Pedicure",
      description: "Relaxing foot care with polish",
      price: 450,
      duration: 60,
      category: "Nails",
    },
    {
      name: "Gel Pedicure",
      description: "Gel polish pedicure for lasting shine",
      price: 650,
      duration: 75,
      category: "Nails",
    },

    {
      name: "Nail Art (per nail)",
      description: "Custom nail art designs",
      price: 50,
      duration: 10,
      category: "Nails",
    },
    {
      name: "Acrylic Full Set",
      description: "Full set of acrylic nail extensions",
      price: 1200,
      duration: 120,
      category: "Nails",
    },
    {
      name: "Acrylic Refill",
      description: "Acrylic nail maintenance",
      price: 800,
      duration: 90,
      category: "Nails",
    },
  ];

  const spaServices = [
    {
      name: "Swedish Massage",
      description: "Full body relaxation massage",
      price: 800,
      duration: 60,
      category: "Spa",
    },
    {
      name: "Deep Tissue Massage",
      description: "Therapeutic pressure massage",
      price: 1000,
      duration: 60,
      category: "Spa",
    },
    {
      name: "Hot Stone Massage",
      description: "Warm stone therapy massage",
      price: 1200,
      duration: 75,
      category: "Spa",
    },
    {
      name: "Facial Treatment",
      description: "Deep cleansing facial",
      price: 900,
      duration: 60,
      category: "Spa",
    },
    {
      name: "Body Scrub",
      description: "Exfoliating body treatment",
      price: 700,
      duration: 45,
      category: "Spa",
    },
    {
      name: "Aromatherapy Session",
      description: "Essential oils relaxation",
      price: 600,
      duration: 45,
      category: "Spa",
    },
  ];

  // Create Services - LASHES Category
  const lashServices = [
    {
      name: "Classic Lash Extensions",
      description: "Natural-looking lash extensions",
      price: 1500,
      duration: 90,
      category: "Lashes",
    },
    {
      name: "Volume Lash Extensions",
      description: "Fuller, dramatic lash look",
      price: 2000,
      duration: 120,
      category: "Lashes",
    },
    {
      name: "Hybrid Lash Extensions",
      description: "Mix of classic and volume",
      price: 1800,
      duration: 105,
      category: "Lashes",
    },
    {
      name: "Lash Lift",
      description: "Natural lash curling treatment",
      price: 800,
      duration: 60,
      category: "Lashes",
    },
    {
      name: "Lash Tint",
      description: "Lash coloring treatment",
      price: 400,
      duration: 30,
      category: "Lashes",
    },
    {
      name: "Lash Refill",
      description: "Lash extension maintenance",
      price: 900,
      duration: 60,
      category: "Lashes",
    },
  ];

  const allServices = [...nailServices, ...spaServices, ...lashServices];

  const createdServices = [];
  for (const s of allServices) {
    const service = await prisma.service.create({
      data: {
        ...s,
        business_id: business.id,
      },
    });
    createdServices.push(service);
  }
  console.log(
    `Created ${createdServices.length} services for ${business.name}`,
  );

  // Create Service Packages
  const packages = [
    {
      name: "Pamper Me Package",
      description:
        "Complete nail care experience - Gel Manicure + Gel Pedicure",
      price: 1100, // Discounted from 1200
      duration: 135,
      category: "Nails",
      serviceNames: ["Gel Manicure", "Gel Pedicure"],
    },
    {
      name: "Relaxation Retreat",
      description:
        "Ultimate spa experience - Swedish Massage + Facial + Body Scrub",
      price: 2200, // Discounted from 2400
      duration: 165,
      category: "Spa",
      serviceNames: ["Swedish Massage", "Facial Treatment", "Body Scrub"],
    },
    {
      name: "Lash & Lift Combo",
      description: "Complete lash transformation - Lash Lift + Lash Tint",
      price: 1100, // Discounted from 1200
      duration: 90,
      category: "Lashes",
      serviceNames: ["Lash Lift", "Lash Tint"],
    },
    {
      name: "Bridal Beauty Package",
      description:
        "Full bridal prep - Gel Manicure + Gel Pedicure + Classic Lash Extensions + Facial",
      price: 3500, // Big discount for brides
      duration: 285,
      category: "Spa",
      serviceNames: [
        "Gel Manicure",
        "Gel Pedicure",
        "Classic Lash Extensions",
        "Facial Treatment",
      ],
    },
  ];

  for (const pkg of packages) {
    const packageServices = createdServices.filter((s) =>
      pkg.serviceNames.includes(s.name),
    );

    await prisma.servicePackage.create({
      data: {
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        duration: pkg.duration,
        category: pkg.category,
        business_id: business.id,
        services: {
          connect: packageServices.map((s) => ({ id: s.id })),
        },
      },
    });
  }
  console.log(`Created ${packages.length} service packages`);

  // Create Employee User
  const employeeUser = await prisma.user.create({
    data: {
      email: "anna@beautyfeel.com",
      name: "Anna Reyes",
      hashed_password: await hash("employee123", 12),
      role: Role.EMPLOYEE,
    },
  });

  await prisma.employee.create({
    data: {
      user_id: employeeUser.id,
      business_id: business.id,
      salary: 18000,
      daily_salary: 600,
      commission_percentage: 10,
    },
  });
  console.log(`Created employee: ${employeeUser.name}`);

  // Create another employee
  const employeeUser2 = await prisma.user.create({
    data: {
      email: "joy@beautyfeel.com",
      name: "Joy Dela Cruz",
      hashed_password: await hash("employee123", 12),
      role: Role.EMPLOYEE,
    },
  });

  await prisma.employee.create({
    data: {
      user_id: employeeUser2.id,
      business_id: business.id,
      salary: 16000,
      daily_salary: 533,
      commission_percentage: 8,
    },
  });
  console.log(`Created employee: ${employeeUser2.name}`);

  // Create sample customers
  const customers = [
    { name: "Sofia Cruz", email: "sofia@email.com", phone: "09171234567" },
    { name: "Camille Tan", email: "camille@email.com", phone: "09181234567" },
    { name: "Patricia Lim", email: "patricia@email.com", phone: "09191234567" },
  ];

  for (const c of customers) {
    await prisma.customer.create({
      data: {
        ...c,
        business_id: business.id,
      },
    });
  }
  console.log(`Created ${customers.length} customers`);

  console.log("\n✅ Seeding finished successfully!");
  console.log("\n📋 Login Credentials:");
  console.log("   Owner: owner@beautyfeel.com / password123");
  console.log("   Employee: anna@beautyfeel.com / employee123");
  console.log("   Employee: joy@beautyfeel.com / employee123");
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
