import type { User } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/data/db";
import { addresses, users } from "@/lib/data/schema";

export async function addNewUser(clerkUser: User) {
  const [newUser] = await db
    .insert(users)
    .values({
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0].emailAddress,
    })
    .returning();
  return newUser;
}

export async function getAddressesForUser(clerkId: string) {
  const res = await db
    .select()
    .from(addresses)
    .leftJoin(users, eq(users.id, addresses.userId))
    .where(eq(users.id, clerkId));

  return res.map((r) => r.addresses);
}
