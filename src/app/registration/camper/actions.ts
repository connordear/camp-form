"use server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/data/db";
import { addresses, campers } from "@/lib/data/schema";
import { getCampersForUser } from "@/lib/services/camper-service";
import { getAddressesForUser, getUser } from "@/lib/services/user-service";
import type { AddressFormValues, CamperInfo, CamperInfoForm } from "./schema";

export async function getCampers(): Promise<CamperInfo[] | undefined> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Must be logged in to view this data.");
  }

  const res = await getCampersForUser(userId);

  return res?.campers;
}

export async function getAddresses() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Must be logged in to view this data.");
  }

  return await getAddressesForUser(clerkId);
}

export async function saveCamper(camper: CamperInfoForm) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Not logged in");
  }

  const { id: userId } = await getUser(clerkId);

  if (userId !== camper.userId) {
    throw new Error("Unable to save data for that camper");
  }

  const { id, userId: _uid, ...camperInfo } = camper;

  const updatedId = await db
    .update(campers)
    .set(camperInfo)
    .where(and(eq(campers.id, id), eq(campers.userId, userId)))
    .returning({ id: campers.id });

  return updatedId;
}

export async function saveAddress(address: AddressFormValues) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Not logged in");
  }

  const { id: userId } = await getUser(clerkId);

  const { id, ...addressPayload } = address;

  const [upsertedAddress] = await db
    .insert(addresses)
    .values({
      id,
      userId,
      ...addressPayload,
    })
    .onConflictDoUpdate({
      target: [addresses.id],
      set: addressPayload,
      where: eq(addresses.userId, userId),
    })
    .returning();

  return upsertedAddress;
}
