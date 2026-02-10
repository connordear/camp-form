"use server";

import { and, asc, eq, notInArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import z from "zod";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import {
  campers,
  camps,
  campYearPrices,
  campYears,
  registrations,
  user,
} from "@/lib/data/schema";
import { getRegistrationsForUser } from "@/lib/services/registration-service";
import { campSchema } from "@/lib/types/common-schema";
import type { Camp } from "@/lib/types/common-types";
import { type CampFormUser, saveCampersSchema } from "./schema";

export async function getCamps() {
  return await db.query.camps.findMany();
}

export async function getCampsForYear(
  year = new Date().getFullYear(),
): Promise<Camp[]> {
  const rows = await db
    .select()
    .from(camps)
    .innerJoin(campYears, eq(camps.id, campYears.campId))
    // 1. Join prices where CampId AND Year match
    .leftJoin(
      campYearPrices,
      and(
        eq(campYearPrices.campId, campYears.campId),
        eq(campYearPrices.year, campYears.year),
      ),
    )
    .where(eq(campYears.year, year))
    .orderBy(asc(campYears.startDate));

  // 2. Reduce flat rows into nested objects
  const result = rows.reduce<Record<string, Camp>>((acc, row) => {
    const camp = row.camps;
    const campYear = row.camp_years;
    const price = row.camp_year_prices;

    if (!acc[camp.id]) {
      acc[camp.id] = {
        ...camp,
        ...campYear,
        prices: [],
      } as Camp;
    }

    if (price) {
      acc[camp.id].prices.push(price);
    }

    return acc;
  }, {});

  return z.array(campSchema).parse(Object.values(result));
}

export async function getRegistrations(): Promise<CampFormUser | undefined> {
  const session = await requireAuth();
  const userId = session.user.id;

  const res = await getRegistrationsForUser(userId);

  if (!res) {
    // User doesn't exist yet in our DB - this shouldn't happen with Better Auth
    // since users are created on sign-up, but we handle it gracefully
    return undefined;
  }

  return res;
}

export async function saveRegistrationsForUser(
  rawCampersData: unknown,
): Promise<CampFormUser> {
  const session = await requireAuth();
  const userId = session.user.id;

  const campersData = saveCampersSchema.parse(rawCampersData);

  return await db.transaction(async (tx) => {
    // 1. Get User
    const userData = await tx.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { id: true },
    });

    if (!userData) throw new Error("User not found");

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
          userId: userData.id, // Ensure ownership
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
            eq(campers.userId, userData.id),
            notInArray(campers.id, activeCamperIds),
          ),
        );
    } else if (campersData.length === 0) {
      // Edge case: User deleted ALL campers
      await tx.delete(campers).where(eq(campers.userId, userData.id));
    }

    // Revalidate AFTER the transaction commits
    revalidatePath("/registration");

    // 2. Return Fresh Data
    const updatedUser = await tx.query.user.findFirst({
      where: eq(user.id, userData.id),
      with: {
        campers: {
          with: { registrations: true },
        },
      },
    });

    return updatedUser as CampFormUser;
  });
}
