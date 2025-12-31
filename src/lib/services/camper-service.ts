import { asc, eq } from "drizzle-orm";
import { db } from "../data/db";
import { users } from "../data/schema";

export async function getCampersForUser(clerkId: string) {
  return await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
    with: {
      campers: {
        orderBy: (t) => asc(t.id),
      },
    },
  });
}
