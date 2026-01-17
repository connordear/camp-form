"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/data/db";
import { medicalInfo } from "@/lib/data/schema";
import { getCampersForUser } from "@/lib/services/camper-service";
import { type CamperWithMedicalInfo, medicalInfoSchema } from "./schema";

export async function getMedicalInfo(): Promise<CamperWithMedicalInfo[]> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Must be logged in to view this data.");
  }

  const res = await getCampersForUser(userId, true);

  if (!res) return [];

  return res.campers.map((camper) => {
    const { medicalInfo, ...camperData } = camper;

    return {
      camper: camperData,
      medicalInfo: medicalInfo || null,
    };
  });
}

export async function saveMedicalInfo(rawInput: unknown) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const data = medicalInfoSchema.parse(rawInput);

  const res = await getCampersForUser(userId, true);
  if (!res?.campers.some((c) => c.id === data.camperId)) {
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
