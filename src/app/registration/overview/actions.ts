"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/data/db";
import {
  campers,
  camps,
  campYears,
  registrations,
  users,
} from "@/lib/data/schema";
import { getRegistrationsForUser } from "@/lib/services/registration-service";
import { addNewUser } from "@/lib/services/user-service";
import type { Camp } from "@/lib/types/common-types";
import { saveCampersSchema } from "./schema";
import type { CampFormUser } from "./types";

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
  if (!clerkId) throw new Error("Must be logged in.");

  const campersData = saveCampersSchema.parse(rawCampersData);

  return await db.transaction(async (tx) => {
    // 1. Get User
    const user = await tx.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
      columns: { id: true },
    });

    if (!user) throw new Error("User not found");

    const activeCamperIds: string[] = [];

    // --- PROCESS CAMPERS ---
    for (const camper of campersData) {
      const { registrations: camperRegistrations, ...camperData } = camper;

      // A. Unified Upsert for Camper
      // Since 'id' is always a valid CUID, we just try to insert it.
      // If it collides (already exists), we update it.
      await tx
        .insert(campers)
        .values({
          ...camperData,
          userId: user.id, // Ensure ownership
        })
        .onConflictDoUpdate({
          target: campers.id,
          set: camperData,
        });

      activeCamperIds.push(camperData.id);

      // --- PROCESS REGISTRATIONS ---
      const activeRegIds: string[] = [];

      if (camperRegistrations) {
        for (const reg of camperRegistrations) {
          const { ...regData } = reg;

          // B. Unified Upsert for Registration
          await tx
            .insert(registrations)
            .values({
              ...regData,
              camperId: camperData.id,
            })
            .onConflictDoUpdate({
              target: registrations.id,
              set: {
                ...regData,
                // OPTIONAL: "Smart" protection.
                // If the existing row in DB is NOT draft, ignore the incoming campId change.
                // This replaces your old 'if status === draft' logic with SQL-level safety.
                campId: sql`
                  CASE 
                    WHEN registrations.status = 'draft' THEN ${regData.campId} 
                    ELSE registrations.camp_id 
                  END
                `,
              },
            });

          activeRegIds.push(regData.id);
        }

        // C. Delete removed drafts
        // "Delete where camperId is X AND id is NOT IN the new list AND status is draft"
        if (activeRegIds.length > 0) {
          await tx
            .delete(registrations)
            .where(
              and(
                eq(registrations.camperId, camperData.id),
                eq(registrations.status, "draft"),
                notInArray(registrations.id, activeRegIds),
              ),
            );
        } else {
          // Edge case: User deleted ALL registrations for this camper
          await tx
            .delete(registrations)
            .where(
              and(
                eq(registrations.camperId, camperData.id),
                eq(registrations.status, "draft"),
              ),
            );
        }
      }
    }

    // --- CLEANUP DELETED CAMPERS ---
    if (activeCamperIds.length > 0) {
      await tx
        .delete(campers)
        .where(
          and(
            eq(campers.userId, user.id),
            notInArray(campers.id, activeCamperIds),
          ),
        );
    } else if (campersData.length === 0) {
      // Edge case: User deleted ALL campers
      await tx.delete(campers).where(eq(campers.userId, user.id));
    }

    // Revalidate AFTER the transaction commits
    revalidatePath("/registration");

    // 2. Return Fresh Data
    const updatedUser = await tx.query.users.findFirst({
      where: eq(users.id, user.id),
      with: {
        campers: {
          with: { registrations: true },
        },
      },
    });

    return updatedUser as CampFormUser;
  });
}
