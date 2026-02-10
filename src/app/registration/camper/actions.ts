"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import { addresses, campers } from "@/lib/data/schema";
import { getCampersForUser } from "@/lib/services/camper-service";
import { getAddressesForUser } from "@/lib/services/user-service";
import type { AddressFormValues, CamperInfo, CamperInfoForm } from "./schema";

export async function getCampers(): Promise<CamperInfo[] | undefined> {
  const session = await requireAuth();
  const userId = session.user.id;

  const res = await getCampersForUser(userId);

  return res?.campers;
}

export async function getAddresses() {
  const session = await requireAuth();
  const userId = session.user.id;

  return await getAddressesForUser(userId);
}

export async function saveCamper(camper: CamperInfoForm) {
  const session = await requireAuth();
  const userId = session.user.id;

  if (userId !== camper.userId) {
    throw new Error("Unable to save data for that camper");
  }

  const { id, userId: _uid, ...camperInfo } = camper;

  await db
    .update(campers)
    .set(camperInfo)
    .where(and(eq(campers.id, id), eq(campers.userId, userId)))
    .returning({ id: campers.id });
}

export async function saveAddress(
  address: AddressFormValues,
  forCamperId?: string,
) {
  const session = await requireAuth();
  const userId = session.user.id;

  const { id, ...addressPayload } = address;
  return await db.transaction(async (tx) => {
    const [upsertedAddress] = await tx
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

    if (forCamperId) {
      await tx
        .update(campers)
        .set({
          addressId: upsertedAddress.id,
        })
        .where(and(eq(campers.id, forCamperId), eq(campers.userId, userId)));
    }

    revalidatePath("/registration/campers");

    return upsertedAddress;
  });
}
