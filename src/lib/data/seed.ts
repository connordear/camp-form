import { faker } from "@faker-js/faker";
import { setFaker } from "zod-schema-faker/v4";
import { camps, campYearPrices, campYears } from "@/lib/data/schema";
import { db } from "./db";

setFaker(faker);
faker.seed(Number(process.env.SEED_VALUE || 1234));

async function seed() {
  console.log("🌱 Starting Drizzle seeding...");

  // 1. Generate Base Camp Data
  const devCamps = Array.from({ length: 10 }, () => {
    // Note: We use the base properties, but we'll overwrite the name
    const adjective = faker.commerce.productAdjective();
    const noun = faker.helpers.arrayElement([
      "Adventure",
      "Coding",
      "Music",
      "Space",
      "Soccer",
      "MADD",
      "Outdoor",
      "Science",
      "Math",
      "Volleyball",
      "Drama",
    ]);
    const name = `${adjective} ${noun} Camp`;

    return {
      name,
      slug: faker.helpers.slugify(name).toLowerCase(), // Assuming you have a slug field
      description: faker.lorem.sentence(),
      // Add other required base camp fields here if your schema has them
    };
  });

  // 2. Clear existing data
  // Order matters due to Foreign Keys!
  await db.delete(campYearPrices);
  await db.delete(campYears);
  await db.delete(camps);

  // 3. Insert Camps
  const campRes = await db
    .insert(camps)
    .values(devCamps)
    .returning({ id: camps.id, name: camps.name });

  const currYear = 2026;

  // 4. Prepare Camp Years
  const cyValues = campRes.map((camp, i) => {
    const start = new Date("2026-06-01");
    // Stagger start dates by weeks
    start.setDate(start.getDate() + i * 7);

    const end = new Date(start);
    end.setDate(end.getDate() + 5); // 5 day camp

    return {
      campId: camp.id,
      year: currYear,
      startDate: start.toISOString(), // Use ISO string for dates usually
      endDate: end.toISOString(),
      capacity: faker.helpers.arrayElement([20, 30, 40, 50]),
      isOpen: true,
    };
  });

  // 5. Insert Camp Years
  // We need the result to link prices correctly (though we know the composite key is campId + year)
  await db.insert(campYears).values(cyValues);

  // 6. Generate & Insert Prices
  // For every camp year, we will create 2 prices: a base rate and a day rate
  const priceValues = cyValues.flatMap((cy) => {
    const basePrice =
      Number(faker.commerce.price({ min: 150, max: 400, dec: 0 })) * 100;

    return [
      // Option A: Full Week Standard Price
      {
        name: "Standard Registration",
        campId: cy.campId,
        year: cy.year,
        price: basePrice, // Store as integer if your DB expects cents/dollars? Usually integers are safer.
        isDayPrice: false,
      },
      // Option B: Daily Rate (slightly more expensive per day)
      {
        name: "Day Drop-in Rate",
        campId: cy.campId,
        year: cy.year,
        price: Math.floor(basePrice / 5) + 10, // Cost of 1 day + premium
        isDayPrice: true,
      },
    ];
  });

  const priceResult = await db.insert(campYearPrices).values(priceValues);

  console.log(
    `✅ Seeding complete! Created ${campRes.length} camps and ${priceValues.length} price options.`,
  );
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
