"use server";

import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import { medicalInfo } from "@/lib/data/schema";
import { getCampersForUser } from "@/lib/services/camper-service";
import { type CamperWithMedicalInfo, medicalInfoSchema } from "./schema";

export async function getMedicalInfo(): Promise<CamperWithMedicalInfo[]> {
  const session = await requireAuth();
  const userId = session.user.id;

  const res = await getCampersForUser(userId, true);

  if (!res) return [];

  return res.campers.map((camper: (typeof res.campers)[number]) => {
    const { medicalInfo, ...camperData } = camper;

    return {
      camper: camperData,
      medicalInfo: medicalInfo || null,
    };
  });
}

export async function saveMedicalInfo(rawInput: unknown) {
  const session = await requireAuth();
  const userId = session.user.id;

  const data = medicalInfoSchema.parse(rawInput);

  const res = await getCampersForUser(userId, true);
  if (!res?.campers.some((c: { id: string }) => c.id === data.camperId)) {
    throw new Error("Unauthorized");
  }

  try {
    // 3. The Upsert Logic
    // "Try to insert. If the PK (camperId) exists, update the fields instead."
    await db.insert(medicalInfo).values(data).onConflictDoUpdate({
      target: medicalInfo.camperId, // The constraint to check (Primary Key)
      set: data, // The values to update if conflict occurs
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to save medical info:", error);
    throw new Error("Database error: Failed to save medical record.");
  }
}
