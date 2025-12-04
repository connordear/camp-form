"use server";

import { db } from "@/lib/db";
import { users, campers, registrations } from "@/lib/schema";
import type { CampFormUser } from "@/lib/types/user-types";
import type { User } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";

async function getUserByClerkId(clerkId: string) {
  return await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
}

export async function getUser(clerkUser: User) {
  // check if the user exists
  const user = await getUserByClerkId(clerkUser.id);

  if (!user) {
    // add them to the db
    await db.insert(users).values({
      clerkId: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
    });
    return getUserByClerkId(clerkUser.id);
  }
  return user;
}

export async function getRegistrationsForUser(
  clerkId: string,
): Promise<CampFormUser | undefined> {
  return await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
    with: {
      campers: {
        with: { registrations: true },
      },
    },
  });
}

export async function saveRegistrationsForUser(
  clerkId: string,
  campersData: CampFormUser["campers"],
): Promise<CampFormUser> {
  // Validate input
  // TODO REWRITE THIS SHIT
  if (!clerkId || !campersData || !Array.isArray(campersData)) {
    throw new Error("Invalid input: clerkId and campersData are required");
  }

  // Get user
  const user = await getUserByClerkId(clerkId);
  if (!user) {
    throw new Error("User not found");
  }

  try {
    // Process campers sequentially (no transaction support in Neon HTTP driver)
    for (const camper of campersData) {
      // Validate camper data
      if (!camper.name?.trim()) {
        throw new Error("Camper name is required");
      }

      const [upsertedCamper] = await db
        .insert(campers)
        .values({
          name: camper.name.trim(),
          userId: user.id,
        })
        .onConflictDoUpdate({
          target: [campers.userId, campers.name],
          set: { name: camper.name.trim() },
        })
        .returning();

      // Process registrations for this camper
      const registrationValues = camper.registrations
        .filter((reg) => reg.campId != null)
        .map((reg) => ({
          campId: reg.campId!,
          camperId: upsertedCamper.id,
          isPaid: reg.isPaid ?? false,
        }));

      if (registrationValues.length > 0) {
        await db
          .insert(registrations)
          .values(registrationValues)
          .onConflictDoUpdate({
            target: [registrations.campId, registrations.camperId],
            set: { isPaid: sql`excluded.is_paid` },
          });
      }
    }

    // Return updated user data
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
      with: {
        campers: {
          with: { registrations: true },
        },
      },
    });

    if (!updatedUser) {
      throw new Error("Failed to retrieve updated user data");
    }

    return updatedUser;
  } catch (error) {
    console.error("Error saving registrations:", error);
    throw new Error("Failed to save registrations. Please try again.");
  }
}
