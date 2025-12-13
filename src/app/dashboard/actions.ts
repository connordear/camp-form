"use server";

import { db } from "@/lib/data/db";
import { users, campers, registrations } from "@/lib/schema";
import type { CampFormUser } from "@/lib/types/user-types";
import { saveCampersSchema } from "@/lib/zod-schema";
import type { User } from "@clerk/nextjs/server";
import { and, eq, notInArray, sql } from "drizzle-orm";

async function getUserByClerkId(clerkId: string) {
  return await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });
}

export async function getCamps() {
  return await db.query.camps.findMany();
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
  userId: number,
  rawCampersData: unknown,
): Promise<CampFormUser> {
  if (!userId) throw new Error("Unauthorized");
  const campersData = saveCampersSchema.parse(rawCampersData);

  return await db.transaction(async (tx) => {
    // Get the internal User ID first
    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true },
    });

    if (!user) throw new Error("User not found");

    // Track IDs of campers that are "active" in this form state.
    // We will use this list to delete any campers that are in the DB but NOT in this list.
    const activeCamperIds: number[] = [];

    // --- PROCESS CAMPERS ---
    for (const camper of campersData) {
      if (!camper.name?.trim()) continue; // Skip empty rows

      const {
        id: _id,
        registrations: camperRegistrations,
        ...camperData
      } = camper;

      // A. Upsert Camper
      // If camper.id is present (and valid), we update. If not, we insert.
      const [upsertedCamper] = await tx
        .insert(campers)
        .values({
          // Handle both '0' (if you use that for new) or undefined/null
          ...camperData,
          id: camper.id && camper.id > 0 ? camper.id : undefined,
          userId: user.id,
        })
        .onConflictDoUpdate({
          target: [campers.id],
          set: { name: camper.name.trim() },
        })
        .returning({ id: campers.id }); // Return ID so we can use it for relations

      // Add to our "Keep" list
      activeCamperIds.push(upsertedCamper.id);

      // --- PROCESS REGISTRATIONS (Nested) ---

      // Filter valid registrations from the form
      const validRegs = (camperRegistrations || []).filter(
        (r) => r.campId != null,
      );

      const activeCampIds = validRegs.map((r) => r.campId!);

      if (activeCampIds.length > 0) {
        // B1. Delete registrations that were removed in the UI
        // "Delete where camperId is X AND campId is NOT IN the new list"
        await tx
          .delete(registrations)
          .where(
            and(
              eq(registrations.camperId, upsertedCamper.id),
              notInArray(registrations.campId, activeCampIds),
            ),
          );

        // B2. Upsert current registrations
        for (const reg of validRegs) {
          await tx
            .insert(registrations)
            .values({
              campId: reg.campId!,
              camperId: upsertedCamper.id,
              isPaid: reg.isPaid ?? false,
            })
            .onConflictDoUpdate({
              target: [registrations.campId, registrations.camperId],
              set: { isPaid: sql`excluded.is_paid` },
            });
        }
      } else {
        // If no camps selected, clear ALL registrations for this camper
        await tx
          .delete(registrations)
          .where(eq(registrations.camperId, upsertedCamper.id));
      }
    }

    // --- CLEANUP DELETED CAMPERS ---

    // Delete any campers belonging to this user that were NOT in the form data
    if (activeCamperIds.length > 0) {
      await tx
        .delete(campers)
        .where(
          and(
            eq(campers.userId, user.id),
            notInArray(campers.id, activeCamperIds),
          ),
        );
    } else {
      // Edge case: User deleted ALL campers in the UI
      if (campersData.length === 0) {
        await tx.delete(campers).where(eq(campers.userId, user.id));
      }
    }

    // 3. Return Fresh Data
    // We refetch to ensure the client UI is perfectly in sync with the DB IDs
    const updatedUser = await tx.query.users.findFirst({
      where: eq(users.id, user.id),
      with: {
        campers: {
          with: { registrations: true },
        },
      },
    });

    if (!updatedUser) throw new Error("Failed to sync");

    return updatedUser as CampFormUser;
  });
}
