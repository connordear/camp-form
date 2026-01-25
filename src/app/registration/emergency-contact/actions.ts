"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/data/db";
import {
  camperEmergencyContacts,
  campers,
  emergencyContacts,
  users,
} from "@/lib/data/schema";
import {
  type CamperWithEmergencyContacts,
  type EmergencyContact,
  emergencyContactInsertSchema,
} from "./schema";

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Must be logged in to view this data.");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      emergencyContacts: {
        orderBy: (t) => asc(t.createdAt),
      },
    },
  });

  return user?.emergencyContacts ?? [];
}

export async function getCampersWithEmergencyContacts(): Promise<
  CamperWithEmergencyContacts[]
> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Must be logged in to view this data.");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      campers: {
        orderBy: (t) => asc(t.createdAt),
        with: {
          emergencyContacts: {
            orderBy: (t) => asc(t.priority),
            with: {
              emergencyContact: true,
            },
          },
        },
      },
    },
  });

  if (!user) return [];

  return user.campers.map((camper) => ({
    camper: {
      id: camper.id,
      userId: camper.userId,
      addressId: camper.addressId,
      firstName: camper.firstName,
      lastName: camper.lastName,
      dateOfBirth: camper.dateOfBirth,
      swimmingLevel: camper.swimmingLevel,
      gender: camper.gender,
      hasBeenToCamp: camper.hasBeenToCamp,
      shirtSize: camper.shirtSize,
      arePhotosAllowed: camper.arePhotosAllowed,
      dietaryRestrictions: camper.dietaryRestrictions,
      createdAt: camper.createdAt,
      updatedAt: camper.updatedAt,
    },
    emergencyContacts: camper.emergencyContacts.map((ec) => ({
      ...ec.emergencyContact,
      priority: ec.priority,
    })),
  }));
}

export async function saveEmergencyContact(rawInput: unknown) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not logged in");
  }

  const data = emergencyContactInsertSchema.parse(rawInput);

  // If updating an existing contact, verify ownership
  if (data.id) {
    const existing = await db.query.emergencyContacts.findFirst({
      where: eq(emergencyContacts.id, data.id),
    });

    // Only check ownership if the contact already exists
    if (existing && existing.userId !== userId) {
      throw new Error("Unable to update that contact");
    }
  }

  const { id, ...contactPayload } = data;

  const [savedContact] = await db
    .insert(emergencyContacts)
    .values({
      id,
      userId,
      ...contactPayload,
    })
    .onConflictDoUpdate({
      target: emergencyContacts.id,
      set: contactPayload,
      where: eq(emergencyContacts.userId, userId),
    })
    .returning();

  revalidatePath("/registration/emergency-contact");

  return savedContact;
}

export async function deleteEmergencyContact(contactId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not logged in");
  }

  // Verify ownership
  const contact = await db.query.emergencyContacts.findFirst({
    where: and(
      eq(emergencyContacts.id, contactId),
      eq(emergencyContacts.userId, userId),
    ),
    with: {
      camperAssignments: true,
    },
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  // Check if assigned to any campers (restrict deletion)
  if (contact.camperAssignments.length > 0) {
    throw new Error(
      "Cannot delete contact while assigned to campers. Please remove from all campers first.",
    );
  }

  await db
    .delete(emergencyContacts)
    .where(
      and(
        eq(emergencyContacts.id, contactId),
        eq(emergencyContacts.userId, userId),
      ),
    );

  revalidatePath("/registration/emergency-contact");

  return { success: true };
}

export async function saveCamperEmergencyContacts(
  camperId: string,
  contactIds: string[],
) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not logged in");
  }

  // Verify camper belongs to user
  const camper = await db.query.campers.findFirst({
    where: and(eq(campers.id, camperId), eq(campers.userId, userId)),
  });

  if (!camper) {
    throw new Error("Camper not found");
  }

  // Verify all contacts belong to user
  if (contactIds.length > 0) {
    const contacts = await db.query.emergencyContacts.findMany({
      where: and(eq(emergencyContacts.userId, userId)),
    });

    const userContactIds = new Set(contacts.map((c) => c.id));
    for (const contactId of contactIds) {
      if (!userContactIds.has(contactId)) {
        throw new Error("One or more contacts do not belong to this user");
      }
    }
  }

  // Validate count (2-4 contacts)
  if (contactIds.length < 2 || contactIds.length > 4) {
    throw new Error("Each camper must have between 2 and 4 emergency contacts");
  }

  await db.transaction(async (tx) => {
    // Remove existing assignments for this camper
    await tx
      .delete(camperEmergencyContacts)
      .where(eq(camperEmergencyContacts.camperId, camperId));

    // Insert new assignments with auto-assigned priority
    if (contactIds.length > 0) {
      const assignments = contactIds.map((contactId, index) => ({
        camperId,
        emergencyContactId: contactId,
        priority: index + 1,
      }));

      await tx.insert(camperEmergencyContacts).values(assignments);
    }
  });

  revalidatePath("/registration/emergency-contact");

  return { success: true };
}
