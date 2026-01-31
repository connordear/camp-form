import { and, eq, inArray } from "drizzle-orm";
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

/**
 * Gets all registrations for a user for a specific year with all related data
 * needed to determine completeness status.
 * Includes: camper info, address, registration details, medical info, emergency contacts
 */
export async function getRegistrationsForCheckoutPage(
  clerkId: string,
  year: number,
) {
  return await db.query.users.findFirst({
    where: eq(users.id, clerkId),
    with: {
      campers: {
        with: {
          address: true,
          medicalInfo: true,
          emergencyContacts: true, // This is the junction table (camperEmergencyContacts)
          registrations: {
            where: eq(registrations.campYear, year),
            with: {
              details: true,
              campYear: {
                with: {
                  camp: true,
                },
              },
              price: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Gets specific registrations by IDs for checkout payment.
 * Only returns draft registrations that belong to the user.
 */
export async function getRegistrationsByIds(
  clerkId: string,
  registrationIds: string[],
) {
  return await db.query.users.findFirst({
    where: eq(users.id, clerkId),
    with: {
      campers: {
        with: {
          registrations: {
            where: and(
              eq(registrations.status, "draft"),
              inArray(registrations.id, registrationIds),
            ),
            with: {
              campYear: {
                with: {
                  camp: true,
                },
              },
              price: true,
            },
          },
        },
      },
    },
  });
}
