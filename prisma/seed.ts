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
  // 1. BUSINESS: BEAUTY FEEL
  // ============================================
  console.log(" Creating BeautyFeel...");

  const bfOwnerUser = await prisma.user.create({
    data: {
      email: "rjpern@gmail.com",
      name: "Ellaine Pe",
      hashed_password: password,
      role: Role.OWNER,
    },
  });

  const beautyFeel = await prisma.business.create({
    data: {
      name: "BeautyFeel",
      slug: "beautyfeel",

      initials: "BF",
      description:
        "Experience premium beauty and wellness services in a relaxing environment. From rejuvenating facials to expert nail care and soothing massages, BeautyFeel is your sanctuary for self-care.",

      owners: { create: { user_id: bfOwnerUser.id } },
      latitude: 9.682940016270514,
      longitude: 118.75246245092016,
    } as any,
  });

  const days = Array.from({ length: 7 }, (_, i) => i);

  for (const d of days) {
    await prisma.businessHours.create({
      data: {
        business_id: beautyFeel.id,
        day_of_week: d,
        open_time: "00:00",
        close_time: "24:00",
        is_closed: false,
        category: "Spa",
      },
    });

    await prisma.businessHours.create({
      data: {
        business_id: beautyFeel.id,
        day_of_week: d,
        open_time: "10:00",
        close_time: "20:00",
        is_closed: false,
        category: "Nails",
      },
    });

    // 3. Skin Category: 10am to 8pm
    await prisma.businessHours.create({
      data: {
        business_id: beautyFeel.id,
        day_of_week: d,
        open_time: "10:00",
        close_time: "20:00",
        is_closed: false,
        category: "Skin",
      },
    });

    // 4. Eyelash Category: 10am to 8pm
    await prisma.businessHours.create({
      data: {
        business_id: beautyFeel.id,
        day_of_week: d,
        open_time: "10:00",
        close_time: "20:00",
        is_closed: false,
        category: "Eyelash",
      },
    });

    // 5. General fallback (if needed)
    await prisma.businessHours.create({
      data: {
        business_id: beautyFeel.id,
        day_of_week: d,
        open_time: "10:00",
        close_time: "20:00",
        is_closed: false,
        category: "GENERAL",
      },
    });
  }

  // BF Services
  const bfServices = [
    // --- Nail Care ---
    {
      name: "Manicure gel",
      price: 280,
      duration: 60,
      category: "Nails",
      description: "Long-lasting gel polish application for hands.",
    },
    {
      name: "Pedicure gel",
      price: 300,
      duration: 60,
      category: "Nails",
      description: "Long-lasting gel polish application for feet.",
    },
    {
      name: "Foot spa",
      price: 250,
      duration: 45,
      category: "Nails",
      description: "Relaxing foot soak and scrub.",
    },
    {
      name: "Foot spa with regular gel",
      price: 430,
      duration: 75,
      category: "Nails",
      description: "Complete foot spa treatment with gel polish.",
    },
    {
      name: "Soft gel nail extensions",
      price: 699,
      duration: 120,
      category: "Nails",
      description: "Natural-looking soft gel extensions.",
    },
    {
      name: "Regular manicure",
      price: 150,
      duration: 45,
      category: "Nails",
      description: "Classic nail cleaning and polish.",
    },

    // --- Eyelash/Eyebrow Services ---
    {
      name: "Classic eyelash extensions",
      price: 399,
      duration: 90,
      category: "Eyelash",
      description: "Natural looking individual lash extensions.",
    },
    {
      name: "Wispy",
      price: 450,
      duration: 90,
      category: "Eyelash",
      description: "Textured, fluttery lash look.",
    },
    {
      name: "Doll eye",
      price: 450,
      duration: 90,
      category: "Eyelash",
      description: "Open-eye effect with longer lashes in the middle.",
    },
    {
      name: "Cat eye",
      price: 450,
      duration: 90,
      category: "Eyelash",
      description: "Elongated look with longer lashes at the corners.",
    },
    {
      name: "Volume",
      price: 500,
      duration: 120,
      category: "Eyelash",
      description: "Fuller, denser lash extensions.",
    },
    {
      name: "Eyelash Perming",
      price: 399,
      duration: 60,
      category: "Eyelash",
      description: "Semi-permanent lash curling.",
    },
    {
      name: "Eyelash Perm with tint",
      price: 450,
      duration: 75,
      category: "Eyelash",
      description: "Lash lift combined with darkening tint.",
    },
    {
      name: "Eyebrow lamination",
      price: 450,
      duration: 60,
      category: "Eyelash",
      description: "Brow smoothing and shaping treatment.",
    },

    // --- Waxing/Body Services (Category: Spa) ---
    {
      name: "Underarm wax",
      price: 350,
      duration: 30,
      category: "Spa",
      description: "Smooth underarm hair removal.",
    },
    {
      name: "Whole Arm",
      price: 350,
      duration: 45,
      category: "Spa",
      description: "Full arm hair removal.",
    },
    {
      name: "Half legs",
      price: 350,
      duration: 45,
      category: "Spa",
      description: "Lower leg hair removal.",
    },
    {
      name: "Whole legs",
      price: 450,
      duration: 60,
      category: "Spa",
      description: "Full leg hair removal.",
    },
    {
      name: "Brazilian",
      price: 800,
      duration: 60,
      category: "Spa",
      description: "Complete intimate waxing.",
    },
    {
      name: "Whole body scrub",
      price: 750,
      duration: 60,
      category: "Spa",
      description: "Exfoliating full body treatment.",
    },

    // --- Skin Care Treatment ---
    {
      name: "Deep cleaning facial",
      price: 800,
      duration: 60,
      category: "Skin",
      description: "Thorough cleansing and extraction.",
    },
    {
      name: "Lightening facial",
      price: 1200,
      duration: 60,
      category: "Skin",
      description: "Brightening treatment for uneven skin tone.",
    },
    {
      name: "Hydraderma facial",
      price: 1500,
      duration: 75,
      category: "Skin",
      description: "Intense hydration treatment.",
    },
    {
      name: "Wart treatment (minimum)",
      price: 800,
      duration: 30,
      category: "Skin",
      description: "Removal of skin warts.",
    },
    {
      name: "Acne facial",
      price: 999,
      duration: 75,
      category: "Skin",
      description: "Targeted treatment for acne-prone skin.",
    },
    {
      name: "BB glow with cheek blush",
      price: 2300,
      duration: 90,
      category: "Skin",
      description: "Semi-permanent foundation effect.",
    },
    {
      name: "Carbon laser deluxe",
      price: 1900,
      duration: 60,
      category: "Skin",
      description: "Laser treatment for pore reduction and glow.",
    },
    {
      name: "CO2 fractional laser",
      price: 5000,
      duration: 60,
      category: "Skin",
      description: "Advanced skin resurfacing.",
    },
    {
      name: "Microneedling",
      price: 3500,
      duration: 90,
      category: "Skin",
      description: "Collagen induction therapy.",
    },
    {
      name: "IPL (Hair growth treatment)",
      price: 500,
      duration: 45,
      category: "Skin",
      description: "Intense Pulsed Light for hair reduction.",
    },
    {
      name: "Exilift (price starts at)",
      price: 899,
      duration: 60,
      category: "Skin",
      description: "Non-surgical skin tightening.",
    },
    {
      name: "Glutathione drip and push(price starts at)",
      price: 800,
      duration: 45,
      category: "Skin",
      description: "IV therapy for skin brightening.",
    },

    // --- Massage Therapy (Category: Spa) ---
    {
      name: "60mins Swedish massage",
      price: 500,
      duration: 60,
      category: "Spa",
      description: "Relaxing full body massage.",
    },
    {
      name: "60mins Combination massage",
      price: 600,
      duration: 60,
      category: "Spa",
      description: "Mix of Swedish and Shiatsu techniques.",
    },
    {
      name: "60mins Thai massage",
      price: 700,
      duration: 60,
      category: "Spa",
      description: "Stretching and deep pressure massage.",
    },
    {
      name: "60mins Siatsu massage",
      price: 700,
      duration: 60,
      category: "Spa",
      description: "Japanese pressure point massage.",
    },
    {
      name: "90 mins Traditional massage",
      price: 800,
      duration: 90,
      category: "Spa",
      description: "Healing traditional hilot massage.",
    },
    {
      name: "90 mins Hot stone massage",
      price: 999,
      duration: 90,
      category: "Spa",
      description: "Massage with heated basalt stones.",
    },
    {
      name: "90mins Ventossa massage",
      price: 999,
      duration: 90,
      category: "Spa",
      description: "Cupping therapy massage.",
    },
    {
      name: "Prenatal massage(DOH lic. Therapist only)",
      price: 500,
      duration: 60,
      category: "Spa",
      description: "Safe and soothing massage for expectant mothers.",
    },
    {
      name: "Pediatric massage",
      price: 500,
      duration: 60,
      category: "Spa",
      description: "Gentle massage for children.",
    },
    {
      name: "30mins back massage",
      price: 300,
      duration: 30,
      category: "Spa",
      description: "Focused relief for back tension.",
    },
    {
      name: "45mins back and head massage",
      price: 400,
      duration: 45,
      category: "Spa",
      description: "Relief for upper body stress.",
    },
    {
      name: "30mins Foot reflex and leg massage",
      price: 300,
      duration: 30,
      category: "Spa",
      description: "Pressure point foot therapy.",
    },
    {
      name: "45mins Foot reflex and leg massage",
      price: 400,
      duration: 45,
      category: "Spa",
      description: "Extended foot and leg therapy.",
    },
    {
      name: "Test Service",
      price: 5,
      duration: 15,
      category: "General",
      description: "A quick test service.",
    },
  ];

  for (const s of bfServices) {
    await prisma.service.create({ data: { ...s, business_id: beautyFeel.id } });
  }

  // BF Employees
  // (Updated based on new Categories: Nails, Skin, Eyelash, Spa)
  const bfEmployees = [
    {
      name: "Jan David Almirante",
      email: "jan@beautyfeel.com",
      specialties: ["Nails", "Spa", "Skin", "Eyelash"],
    },
    {
      name: "Daniel Canoy",
      email: "daniel@beautyfeel.com",
      specialties: ["Nails", "Spa", "Skin", "Eyelash"],
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
  // 2. BUSINESS: GENTLEMAN'S CUT (Barber) - Kept mostly same but ensures compatibility
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
      description:
        "Traditional barbering for the modern gentleman. We offer precision cuts, hot towel shaves, and grooming services in a classic, masculine atmosphere.",

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

  const gcEmployees = [
    {
      name: "Thomas Shelby",
      email: "thomas@gentlemanscut.com",
      specialties: ["Haircut", "Shave", "Grooming", "Chemical"],
    },
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
  console.log("\n✅ Seeding finished successfully!");
  console.log("\n📋 Accounts created with default credentials.");
  console.log("   See README or seed script for details.");
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
