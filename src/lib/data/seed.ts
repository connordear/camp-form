import { faker } from "@faker-js/faker";
import { fake, setFaker } from "zod-schema-faker/v4";
import { camps } from "@/lib/schema";
import { campSchema } from "@/lib/zod-schema";
import { db } from "./db";

setFaker(faker);
faker.seed(Number(process.env.SEED_VALUE || 1234));

async function seed() {
  console.log("🌱 Starting Drizzle seeding...");
  const devCamps = Array.from({ length: 10 }, () =>
    fake(campSchema.omit({ id: true })),
  );

  await db.delete(camps);

  const result = await db.insert(camps).values(devCamps);

  console.log("✅ Seeding complete!", result);
}

// Bun runs this script directly without needing a separate runner!
seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  // Explicitly exit the process
  process.exit(1);
});
