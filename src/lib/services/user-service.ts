import type { User } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/data/db";
import { addresses, users } from "@/lib/data/schema";

export async function addNewUser(clerkUser: User) {
  const [newUser] = await db
    .insert(users)
    .values({
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0].emailAddress,
    })
    .returning();
  return newUser;
}

export async function getUser(clerkId: string) {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw new Error("No user found");
  }
  return user;
}

export async function getAddressesForUser(clerkId: string) {
  const res = await db
    .select()
    .from(addresses)
    .leftJoin(users, eq(users.id, addresses.userId))
    .where(eq(users.clerkId, clerkId));

  return res.map((r) => r.addresses);
}
