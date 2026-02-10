"use server";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import { registrationDetails, registrations } from "@/lib/data/schema";
import { getRegistrationDetailsForUser } from "@/lib/services/registration-service";
import {
  insertRegistrationDetailSchema,
  type RegistrationDetail,
  type RegistrationDetailFormValues,
} from "./schema";

export async function getRegistrations(): Promise<RegistrationDetail[]> {
  const session = await requireAuth();
  const userId = session.user.id;

  const res = await getRegistrationDetailsForUser(userId);

  const regs =
    res?.campers.flatMap(
      (c: { registrations: RegistrationDetail[] }) => c.registrations,
    ) ?? [];
  return regs;
}

export async function saveRegistrationDetails(
  data: RegistrationDetailFormValues,
) {
  const session = await requireAuth();
  const userId = session.user.id;

  const validatedData = insertRegistrationDetailSchema.parse(data);

  // Verify ownership - check the registration belongs to a camper owned by this user
  const registration = await db.query.registrations.findFirst({
    where: eq(registrations.id, validatedData.registrationId),
    with: {
      camper: {
        with: {
          user: true,
        },
      },
    },
  });

  if (!registration || registration.camper?.user?.id !== userId) {
    throw new Error("Unable to save data for that registration");
  }

  const { registrationId, ...detailsPayload } = validatedData;

  const [savedDetails] = await db
    .insert(registrationDetails)
    .values(validatedData)
    .onConflictDoUpdate({
      target: registrationDetails.registrationId,
      set: detailsPayload,
    })
    .returning();

  return savedDetails;
}
