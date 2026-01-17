import { faker } from "@faker-js/faker";
import { fake, setFaker } from "zod-schema-faker/v4";
import { camps, campYears } from "@/lib/data/schema";
import { campSchema } from "../types/common-schema";
import { db } from "./db";

setFaker(faker);
faker.seed(Number(process.env.SEED_VALUE || 1234));

async function seed() {
  console.log("🌱 Starting Drizzle seeding...");
  const devCamps = Array.from({ length: 10 }, () => {
    const base = fake(
      campSchema.omit({ id: true, createdAt: true, updatedAt: true }),
    );
    const adjective = faker.commerce.productAdjective(); // e.g., "Silver", "Rustic"
    const noun = faker.commerce.productName();
    const name = `${adjective} ${noun} Camp`;
    return {
      ...base,
      name,
    };
  });

  await db.delete(campYears);
  await db.delete(camps);

  const campRes = await db
    .insert(camps)
    .values(devCamps)
    .returning({ id: camps.id });

  const currYear = 2026;
  const cyValues = campRes.map((camp, i) => {
    const start = new Date("2026-06-01");
    start.setDate(start.getDate() + i * 7);

    const hasDayPrice = Math.random() > 0.5;

    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const campData = devCamps[i];
    return {
      ...campData,
      startDate: start.toDateString(),
      endDate: end.toDateString(),
      campId: camp.id,
      year: currYear,
      basePrice: faker.helpers.arrayElement([10000, 20000, 30000]),
      dayPrice: hasDayPrice ? faker.helpers.arrayElement([8000, 10000]) : null,
      capacity: faker.helpers.arrayElement([20, 30, 40, 50]),
    };
  });

  const result = await db.insert(campYears).values(cyValues);

  console.log("✅ Seeding complete!", result);
}

// Bun runs this script directly without needing a separate runner!
seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  // Explicitly exit the process
  process.exit(1);
});
