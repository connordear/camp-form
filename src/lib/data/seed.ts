import * as schema from "@/lib/data/schema";
import { db } from "./db";

// 2026 Camp Data Configuration
const CAMPS_DATA = [
  {
    name: "LIT Camp",
    description:
      "Join us at Mulhurst this summer as one of our Leaders in Training (LITs). Responsibilities include helping to supervise younger campers, help with dishes and cleaning, leading camp activities like campfires and games, and supporting your camp counselor in leading a cabin. LIT training is required for any youth wishing to volunteer at Mulhurst this summer.",
    yearData: {
      year: 2026,
      startDate: "2026-06-28",
      endDate: "2026-07-01",
      capacity: 20,
      prices: [
        {
          name: "LIT Registration (Grades 8-12)",
          price: 29355,
          isDayPrice: false,
        },
      ],
    },
  },
  {
    name: "Kids Camp",
    description:
      "This is a 5 night, Sunday-Friday camp for children who have completed grades 2 - 6. Join us for a week at the lake spending time outdoors, making new friends, playing games, singing songs by the campfire, and more!",
    yearData: {
      year: 2026,
      startDate: "2026-07-12",
      endDate: "2026-07-17",
      capacity: 50,
      prices: [
        { name: "Regular Registration", price: 46350, isDayPrice: false },
      ],
    },
  },
  {
    name: "Youth Camp",
    description:
      "This is a 5 night, Sunday- Friday camp for youth who have completed grades 7-11. Join us for a week of fun activities and games at the lake, where you’ll have the opportunity to learn more about yourself and your faith in a supportive and inclusive community.",
    yearData: {
      year: 2026,
      startDate: "2026-07-19",
      endDate: "2026-07-24",
      capacity: 50,
      prices: [
        { name: "Regular Registration", price: 46350, isDayPrice: false },
      ],
    },
  },
  {
    name: "Family Camp",
    description:
      "Come out for three nights (Sunday-Wednesday) to enjoy Mulhurst’s beautiful setting on the lakefront. Enjoy meals prepared for you, activities for the kids, conversation time for the adults, swimming and canoeing at the lake, crafts, campfire sing-alongs, daily devotions, board game nights, sauna, and more.",
    yearData: {
      year: 2026,
      startDate: "2026-07-26",
      endDate: "2026-07-29",
      capacity: 100,
      prices: [
        { name: "Adult (Full Stay)", price: 23175, isDayPrice: false },
        { name: "Youth 10-18 (Full Stay)", price: 17510, isDayPrice: false },
        { name: "Child 4-9 (Full Stay)", price: 12360, isDayPrice: false },
        { name: "Infant 0-3 (Full Stay)", price: 0, isDayPrice: false },
        { name: "Adult (Per Night)", price: 8240, isDayPrice: true },
        { name: "Youth 10-18 (Per Night)", price: 6180, isDayPrice: true },
        { name: "Child 4-9 (Per Night)", price: 4635, isDayPrice: true },
        { name: "Infant 0-3 (Per Night)", price: 0, isDayPrice: true },
      ],
    },
  },
  {
    name: "2-Night Mini Camp",
    description:
      "2-night Mini Camp is perfect for our littlest campers who are ready to dip their toe into an overnight stay at camp. Enjoy all of the fun things about camp and the excitement of staying overnight in a cabin, in a shorter amount of time away from home.",
    yearData: {
      year: 2026,
      startDate: "2026-07-29",
      endDate: "2026-07-31",
      capacity: 40,
      prices: [
        { name: "Registration (K - Grade 4)", price: 15450, isDayPrice: false },
      ],
    },
  },
  {
    name: "4 Night Kids Camp",
    description:
      "This is a 4 night, Monday - Friday camp for children who have completed grades 2 - 6. Join us for a week at the lake spending time outdoors, making new friends, playing games, singing songs by the campfire, and more!",
    yearData: {
      year: 2026,
      startDate: "2026-08-03",
      endDate: "2026-08-07",
      capacity: 50,
      prices: [
        { name: "Regular Registration", price: 36050, isDayPrice: false },
      ],
    },
  },
  {
    name: "MADD Camp",
    description:
      "MADD stands for music, art, drama, and dance. Join us for a week of fun with a special focus on activities like musical jam sessions, extra crafts, improv games, and dancing. All of our classic Mulhurst highlights will be enjoyed too!",
    yearData: {
      year: 2026,
      startDate: "2026-08-09",
      endDate: "2026-08-14",
      capacity: 50,
      prices: [
        {
          name: "Regular Registration (Grades 3-10)",
          price: 46350,
          isDayPrice: false,
        },
      ],
    },
  },
];

async function seed() {
  console.log("🌱 Starting Seeding for 2026 Season...");

  // 1. CLEAR EXISTING DATA
  console.log("🧹 Clearing old data...");
  // Order matters for foreign keys
  await db.delete(schema.registrations);
  await db.delete(schema.campYearPrices);
  await db.delete(schema.campYears);
  await db.delete(schema.camps);
  await db.delete(schema.discounts);

  // 2. INSERT DISCOUNT
  console.log("🎟 Creating Early Bird Discount...");
  await db.insert(schema.discounts).values({
    name: "Early Bird 2026",
    description: "10% off if registered by May 31, 2026",
    type: "percentage",
    amount: 10, // 10%
    conditionType: "deadline",
    deadlineDate: "2026-05-31", // Explicit deadline from brochure
    isActive: true,
  });

  // 3. INSERT CAMPS AND PRICES
  console.log("🏕 Creating Camps...");

  for (const data of CAMPS_DATA) {
    // A. Insert Base Camp
    const [camp] = await db
      .insert(schema.camps)
      .values({
        name: data.name,
        description: data.description,
      })
      .returning({ id: schema.camps.id });

    // B. Insert Camp Year
    await db.insert(schema.campYears).values({
      campId: camp.id,
      year: data.yearData.year,
      startDate: data.yearData.startDate,
      endDate: data.yearData.endDate,
      capacity: data.yearData.capacity,
    });

    // C. Insert Prices
    const priceValues = data.yearData.prices.map((p) => ({
      name: p.name,
      campId: camp.id,
      year: data.yearData.year,
      price: p.price, // Stored in cents (e.g. 22500 = $225.00)
      isDayPrice: p.isDayPrice, // This maps directly to your schema boolean
    }));

    await db.insert(schema.campYearPrices).values(priceValues);

    console.log(`   ✅ Created ${data.name}`);
  }

  console.log("✨ Seeding Complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
