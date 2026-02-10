import { type AnyColumn, and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/data/db";
import { registrations, user } from "@/lib/data/schema";

export async function getRegistrationsForUser(userId: string) {
  return await db.query.user.findFirst({
    where: eq(user.id, userId),
    with: {
      campers: {
        orderBy: (t: { createdAt: AnyColumn }) => asc(t.createdAt),
        with: {
          registrations: true,
        },
      },
    },
  });
}

export async function getRegistrationDetailsForUser(userId: string) {
  return await db.query.user.findFirst({
    where: eq(user.id, userId),
    with: {
      campers: {
        orderBy: (t: { createdAt: AnyColumn }) => asc(t.createdAt),
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

export async function getCheckoutRegistrationsForUser(userId: string) {
  return await db.query.user.findFirst({
    where: eq(user.id, userId),
    with: {
      campers: {
        orderBy: (t: { createdAt: AnyColumn }) => asc(t.createdAt),
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
  userId: string,
  year: number,
) {
  return await db.query.user.findFirst({
    where: eq(user.id, userId),
    with: {
      campers: {
        orderBy: (t: { createdAt: AnyColumn }) => asc(t.createdAt),
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
  userId: string,
  registrationIds: string[],
) {
  return await db.query.user.findFirst({
    where: eq(user.id, userId),
    with: {
      campers: {
        orderBy: (t: { createdAt: AnyColumn }) => asc(t.createdAt),
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
              details: true,
            },
          },
        },
      },
    },
  });
}
