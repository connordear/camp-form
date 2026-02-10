import { type AnyColumn, asc, eq } from "drizzle-orm";
import { db } from "../data/db";
import { user } from "../data/schema";

export async function getCampersForUser(
  userId: string,
  includeMedical: true | undefined = undefined,
) {
  return await db.query.user.findFirst({
    where: eq(user.id, userId),
    with: {
      campers: {
        orderBy: (t: { createdAt: AnyColumn }) => asc(t.createdAt),
        with: {
          medicalInfo: includeMedical,
        },
      },
    },
  });
}
