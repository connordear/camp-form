import * as schema from "@/lib/data/schema";
import { db } from "./db";

type PriceData = {
  name: string;
  price: number;
  isDayPrice: boolean;
};

type CampYearData = {
  year: number;
  startDate: string;
  endDate: string;
  capacity: number;
  prices: PriceData[];
};

type CampData = {
  name: string;
  description: string;
  yearsData: CampYearData[];
};

function shiftDate(dateStr: string, dayOffset: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().split("T")[0];
}

function generateYearsData(
  baseYear: number,
  baseStartDate: string,
  baseEndDate: string,
  capacity: number,
  prices: PriceData[],
): CampYearData[] {
  const years: CampYearData[] = [];
  const yearOffsets: { year: number; offset: number }[] = [
    { year: 2024, offset: 2 },
    { year: 2025, offset: 1 },
    { year: 2026, offset: 0 },
  ];

  for (const { year, offset } of yearOffsets) {
    const yearDiff = baseYear - year;
    years.push({
      year,
      startDate: shiftDate(baseStartDate, -yearDiff * 365 + offset),
      endDate: shiftDate(baseEndDate, -yearDiff * 365 + offset),
      capacity,
      prices: prices.map((p) => ({ ...p })),
    });
  }

  return years;
}

const CAMPS_DATA: CampData[] = [
  {
    name: "LIT Camp",
    description:
      "Join us at Mulhurst this summer as one of our Leaders in Training (LITs). Responsibilities include helping to supervise younger campers, help with dishes and cleaning, leading camp activities like campfires and games, and supporting your camp counselor in leading a cabin. LIT training is required for any youth wishing to volunteer at Mulhurst this summer.",
    yearsData: generateYearsData(2026, "2026-06-28", "2026-07-01", 20, [
      {
        name: "LIT Registration (Grades 8-12)",
        price: 29355,
        isDayPrice: false,
      },
    ]),
  },
  {
    name: "Kids Camp",
    description:
      "This is a 5 night, Sunday-Friday camp for children who have completed grades 2 - 6. Join us for a week at the lake spending time outdoors, making new friends, playing games, singing songs by the campfire, and more!",
    yearsData: generateYearsData(2026, "2026-07-12", "2026-07-17", 50, [
      { name: "Regular Registration", price: 46350, isDayPrice: false },
    ]),
  },
  {
    name: "Youth Camp",
    description:
      "This is a 5 night, Sunday- Friday camp for youth who have completed grades 7-11. Join us for a week of fun activities and games at the lake, where you'll have the opportunity to learn more about yourself and your faith in a supportive and inclusive community.",
    yearsData: generateYearsData(2026, "2026-07-19", "2026-07-24", 50, [
      { name: "Regular Registration", price: 46350, isDayPrice: false },
    ]),
  },
  {
    name: "Family Camp",
    description:
      "Come out for three nights (Sunday-Wednesday) to enjoy Mulhurst's beautiful setting on the lakefront. Enjoy meals prepared for you, activities for the kids, conversation time for the adults, swimming and canoeing at the lake, crafts, campfire sing-alongs, daily devotions, board game nights, sauna, and more.",
    yearsData: generateYearsData(2026, "2026-07-26", "2026-07-29", 100, [
      { name: "Adult (Full Stay)", price: 23175, isDayPrice: false },
      { name: "Youth 10-18 (Full Stay)", price: 17510, isDayPrice: false },
      { name: "Child 4-9 (Full Stay)", price: 12360, isDayPrice: false },
      { name: "Infant 0-3 (Full Stay)", price: 0, isDayPrice: false },
      { name: "Adult (Per Night)", price: 8240, isDayPrice: true },
      { name: "Youth 10-18 (Per Night)", price: 6180, isDayPrice: true },
      { name: "Child 4-9 (Per Night)", price: 4635, isDayPrice: true },
      { name: "Infant 0-3 (Per Night)", price: 0, isDayPrice: true },
    ]),
  },
  {
    name: "2-Night Mini Camp",
    description:
      "2-night Mini Camp is perfect for our littlest campers who are ready to dip their toe into an overnight stay at camp. Enjoy all of the fun things about camp and the excitement of staying overnight in a cabin, in a shorter amount of time away from home.",
    yearsData: generateYearsData(2026, "2026-07-29", "2026-07-31", 40, [
      { name: "Registration (K - Grade 4)", price: 15450, isDayPrice: false },
    ]),
  },
  {
    name: "4 Night Kids Camp",
    description:
      "This is a 4 night, Monday - Friday camp for children who have completed grades 2 - 6. Join us for a week at the lake spending time outdoors, making new friends, playing games, singing songs by the campfire, and more!",
    yearsData: generateYearsData(2026, "2026-08-03", "2026-08-07", 50, [
      { name: "Regular Registration", price: 36050, isDayPrice: false },
    ]),
  },
  {
    name: "MADD Camp",
    description:
      "MADD stands for music, art, drama, and dance. Join us for a week of fun with a special focus on activities like musical jam sessions, extra crafts, improv games, and dancing. All of our classic Mulhurst highlights will be enjoyed too!",
    yearsData: generateYearsData(2026, "2026-08-09", "2026-08-14", 50, [
      {
        name: "Regular Registration (Grades 3-10)",
        price: 46350,
        isDayPrice: false,
      },
    ]),
  },
];

async function seed() {
  console.log("🌱 Starting Seeding for 2024-2026 Seasons...");

  // 1. CLEAR EXISTING DATA
  console.log("🧹 Clearing old data...");
  await db.delete(schema.registrations);
  await db.delete(schema.campYearPrices);
  await db.delete(schema.campYears);
  await db.delete(schema.camps);
  await db.delete(schema.discounts);

  // 2. INSERT DISCOUNTS FOR EACH YEAR
  console.log("🎟 Creating Early Bird Discounts...");
  const discountYears = [
    { year: 2024, deadline: "2024-05-31" },
    { year: 2025, deadline: "2025-05-31" },
    { year: 2026, deadline: "2026-05-31" },
  ];

  for (const { year, deadline } of discountYears) {
    await db.insert(schema.discounts).values({
      name: `Early Bird ${year}`,
      description: `10% off if registered by May 31, ${year}`,
      type: "percentage",
      amount: 10,
      conditionType: "deadline",
      deadlineDate: deadline,
      isActive: true,
    });
    console.log(`   ✅ Created Early Bird ${year} discount`);
  }

  // 3. INSERT CAMPS AND PRICES
  console.log("🏕 Creating Camps...");

  for (const data of CAMPS_DATA) {
    const [camp] = await db
      .insert(schema.camps)
      .values({
        name: data.name,
        description: data.description,
      })
      .returning({ id: schema.camps.id });

    for (const yearData of data.yearsData) {
      await db.insert(schema.campYears).values({
        campId: camp.id,
        year: yearData.year,
        startDate: yearData.startDate,
        endDate: yearData.endDate,
        capacity: yearData.capacity,
      });

      const priceValues = yearData.prices.map((p) => ({
        name: p.name,
        campId: camp.id,
        year: yearData.year,
        price: p.price,
        isDayPrice: p.isDayPrice,
      }));

      await db.insert(schema.campYearPrices).values(priceValues);
    }

    console.log(`   ✅ Created ${data.name} (2024-2026)`);
  }

  console.log("✨ Seeding Complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
