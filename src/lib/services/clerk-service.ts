import type { User } from "@clerk/nextjs/server";
import { db } from "@/lib/data/db";
import { users } from "@/lib/data/schema";

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
