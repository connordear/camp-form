import { asc, eq } from "drizzle-orm";
import { db } from "../data/db";
import { users } from "../data/schema";

export async function getCampersForUser(
  clerkId: string,
  includeMedical: true | undefined = undefined,
) {
  return await db.query.users.findFirst({
    where: eq(users.id, clerkId),
    with: {
      campers: {
        orderBy: (t) => asc(t.createdAt),
        with: {
          medicalInfo: includeMedical,
        },
      },
    },
  });
}
