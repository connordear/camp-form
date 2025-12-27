"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/data/db";
import { campers, camps, campYears, registrations, users } from "@/lib/schema";
import { addNewUser } from "@/lib/services/clerk-service";
import { getRegistrationsForUser } from "@/lib/services/registration-service";
import type { Camp } from "@/lib/types/camp-types";
import type { CampFormUser } from "@/lib/types/user-types";
import { saveCampersSchema } from "@/lib/zod-schema";

export async function getCamps() {
  return await db.query.camps.findMany();
}

export async function getCampsForYear(
  year = new Date().getFullYear(),
): Promise<Array<Camp>> {
  const res = await db
    .select()
    .from(camps)
    .innerJoin(campYears, eq(camps.id, campYears.campId))
    .where(eq(campYears.year, year));
  return res.map((cy) => ({
    ...cy.camps,
    ...cy.camp_years,
  }));
}

export async function getRegistrations(): Promise<CampFormUser | undefined> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Must be logged in to view this data.");
  }

  const res = await getRegistrationsForUser(userId);

  // Temporary measure to handle users that don't exist
  // TODO: remove once webhook is up
  if (!res) {
    const user = await currentUser();
    if (!user) {
      throw new Error("Must be logged in");
    }
    const newUser = await addNewUser(user);
    return {
      ...newUser,
      campers: [],
    };
  }

  return res;
}

export async function saveRegistrationsForUser(
  rawCampersData: unknown,
): Promise<CampFormUser> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Must be logged in to submit this.");
  }
  const campersData = saveCampersSchema.parse(rawCampersData);

  revalidatePath("/registration");

  return await db.transaction(async (tx) => {
    // Get the internal User ID first
    const user = await tx.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
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
        clientId,
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
          clientId,
        })
        .onConflictDoUpdate({
          target: [campers.id],
          set: { ...camperData },
        })
        .returning({ id: campers.id }); // Return ID so we can use it for relations

      // Add to our "Keep" list
      activeCamperIds.push(upsertedCamper.id);

      // --- PROCESS REGISTRATIONS (Nested) ---

      // Filter valid registrations from the form

      const activeRegIds: number[] = [];

      if (camperRegistrations) {
        // Upsert current registrations
        for (const reg of camperRegistrations) {
          // dont' allow to overwrite camper id or status here
          const { id, camperId: _cId, status: _status, ...regData } = reg;
          const [upsertedReg] = await tx
            .insert(registrations)
            .values({
              id,
              camperId: upsertedCamper.id,
              ...regData,
            })
            .onConflictDoUpdate({
              target: [
                registrations.camperId,
                registrations.campId,
                registrations.campYear,
              ],
              set: { camperId: upsertedCamper.id, ...regData },
            })
            .returning({ id: registrations.id });
          activeRegIds.push(upsertedReg.id);
        }
        // B1. Delete registrations that were removed in the UI
        // "Delete where camperId is X AND campId is NOT IN the new list"
        await tx.delete(registrations).where(
          and(
            eq(registrations.camperId, upsertedCamper.id),
            eq(registrations.status, "draft"), // only delete drafts
            notInArray(registrations.id, activeRegIds),
          ),
        );
      } else {
        // If no camps selected, clear ALL registrations for this camper
        await tx
          .delete(registrations)
          .where(
            and(
              eq(registrations.camperId, upsertedCamper.id),
              eq(registrations.status, "draft"),
            ),
          );
      }
    }

    // --- CLEANUP DELETED CAMPERS ---

    // Delete any campers belonging to this user that were NOT in the form data
    //

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
