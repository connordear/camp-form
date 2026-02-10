import { eq } from "drizzle-orm";
import { db } from "@/lib/data/db";
import { addresses, user } from "@/lib/data/schema";

export async function getAddressesForUser(userId: string) {
  const res = await db
    .select()
    .from(addresses)
    .leftJoin(user, eq(user.id, addresses.userId))
    .where(eq(user.id, userId));

  return res.map((r) => r.addresses);
}
