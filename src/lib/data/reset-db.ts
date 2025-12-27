import { sql } from "drizzle-orm";
import { db } from "@/lib/data/db";

async function reset() {
  const start = performance.now();
  console.log("🧨 Dropping public schema...");

  // Execute raw SQL using Drizzle
  await db.execute(sql`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO current_user;
    GRANT ALL ON SCHEMA public TO public;
  `);

  const end = performance.now();
  console.log(`✅ Database reset in ${(end - start).toFixed(2)}ms`);

  // Close connection so script exits gracefully
  // If using postgres.js (common with Bun):
  // await connection.end();
  // If using node-postgres (pg):
  // await connection.end();

  process.exit(0);
}

reset().catch((err) => {
  console.error("❌ Reset failed");
  console.error(err);
  process.exit(1);
});
