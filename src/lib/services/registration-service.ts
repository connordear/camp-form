import { eq } from "drizzle-orm";
import { db } from "@/lib/data/db";
import { registrations, users } from "@/lib/data/schema";

export async function getRegistrationsForUser(clerkId: string) {
  return await db.query.users.findFirst({
    where: eq(users.id, clerkId),
    with: {
      campers: {
        with: {
          registrations: true,
        },
      },
    },
  });
}

export async function getRegistrationDetailsForUser(clerkId: string) {
  return await db.query.users.findFirst({
    where: eq(users.id, clerkId),
    with: {
      campers: {
        with: {
          registrations: {
            with: {
              camper: true,
              details: true,
              campYear: {
                with: {
                  camp: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getCheckoutRegistrationsForUser(clerkId: string) {
  return await db.query.users.findFirst({
    where: eq(users.id, clerkId),
    with: {
      campers: {
        with: {
          registrations: {
            with: {
              campYear: {
                with: {
                  camp: true,
                },
              },
            },
            where: eq(registrations.status, "draft"),
          },
        },
      },
    },
  });
}
