import { and, eq, inArray } from "drizzle-orm";
import { addDays, campgroundToday } from "@/lib/campground/dates";
import { db } from "@/lib/data/db";
import * as schema from "@/lib/data/schema";

export const E2E_CAMP_NAME = "E2E Test Camp";
export const E2E_CAMPER = { firstName: "Eetoo", lastName: "Testcamper" };

async function userIdFor(email: string): Promise<string> {
  const [u] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email));
  if (!u) throw new Error(`No user ${email}; run bun run db:seed:users`);
  return u.id;
}

/** Remove everything a previous run created for this user and the test camp. */
export async function cleanupRegistrationFixture(email: string) {
  const userId = await userIdFor(email);
  const camps = await db
    .select({ id: schema.camps.id })
    .from(schema.camps)
    .where(eq(schema.camps.name, E2E_CAMP_NAME));
  const campIds = camps.map((c) => c.id);

  const campers = await db
    .select({ id: schema.campers.id })
    .from(schema.campers)
    .where(
      and(
        eq(schema.campers.userId, userId),
        eq(schema.campers.firstName, E2E_CAMPER.firstName),
        eq(schema.campers.lastName, E2E_CAMPER.lastName),
      ),
    );
  const camperIds = campers.map((c) => c.id);

  if (camperIds.length) {
    // Registrations, details, medical info and contact links cascade.
    await db
      .delete(schema.campers)
      .where(inArray(schema.campers.id, camperIds));
  }
  await db
    .delete(schema.emergencyContacts)
    .where(
      and(
        eq(schema.emergencyContacts.userId, userId),
        eq(schema.emergencyContacts.name, "E2E Contact"),
      ),
    );
  if (campIds.length) {
    await db
      .delete(schema.registrations)
      .where(inArray(schema.registrations.campId, campIds));
    await db
      .delete(schema.campYearPrices)
      .where(inArray(schema.campYearPrices.campId, campIds));
    await db
      .delete(schema.campYears)
      .where(inArray(schema.campYears.campId, campIds));
    await db.delete(schema.camps).where(inArray(schema.camps.id, campIds));
  }
}

/**
 * A complete draft registration, ready to pay, for a camp starting soon in
 * the current year. Registration lists the earliest year with a camp not yet
 * over, so the fixture camp has to stay inside the current year, which needs
 * at least a week left in it.
 */
export async function createRegistrationFixture(email: string) {
  await cleanupRegistrationFixture(email);
  const userId = await userIdFor(email);

  const today = campgroundToday();
  const year = Number(today.slice(0, 4));
  const startDate = addDays(today, 7); // past the 5-day registration cutoff
  const endDate = addDays(startDate, 2);
  if (Number(endDate.slice(0, 4)) !== year) {
    throw new Error("Registration fixture needs a camp inside the current year");
  }

  const [camp] = await db
    .insert(schema.camps)
    .values({ name: E2E_CAMP_NAME, description: "Created by e2e tests" })
    .returning();
  await db.insert(schema.campYears).values({
    campId: camp.id,
    year,
    startDate,
    endDate,
    capacity: 10,
  });
  const [price] = await db
    .insert(schema.campYearPrices)
    .values({ name: "E2E Price", campId: camp.id, year, price: 10000 })
    .returning();

  const [camper] = await db
    .insert(schema.campers)
    .values({
      userId,
      ...E2E_CAMPER,
      dateOfBirth: "2015-06-01",
      gender: "Other",
      shirtSize: "YM",
      swimmingLevel: "Beginner",
    })
    .returning();
  await db.insert(schema.medicalInfo).values({
    camperId: camper.id,
    healthCareNumber: "123456789",
    familyDoctor: "Dr E2E",
    doctorPhone: "780-555-0100",
  });
  const [contact] = await db
    .insert(schema.emergencyContacts)
    .values({
      userId,
      name: "E2E Contact",
      phone: "780-555-0101",
      relationship: "parent",
    })
    .returning();
  await db.insert(schema.camperEmergencyContacts).values({
    camperId: camper.id,
    emergencyContactId: contact.id,
    priority: 1,
  });
  const [registration] = await db
    .insert(schema.registrations)
    .values({
      campId: camp.id,
      campYear: year,
      priceId: price.id,
      camperId: camper.id,
    })
    .returning();
  await db.insert(schema.registrationDetails).values({
    registrationId: registration.id,
    parentSignature: "E2E Parent",
  });

  return {
    registrationId: registration.id,
    campId: camp.id,
    year,
    startDate,
    endDate,
  };
}

export async function getRegistrationStatus(id: string) {
  const [r] = await db
    .select({
      status: schema.registrations.status,
      pricePaid: schema.registrations.pricePaid,
    })
    .from(schema.registrations)
    .where(eq(schema.registrations.id, id));
  return r;
}

/**
 * A draft registration for a camp in an earlier year, which the overview
 * should neither show nor delete when the family saves.
 */
export async function createPastYearDraftFixture(email: string) {
  await cleanupRegistrationFixture(email);
  const userId = await userIdFor(email);
  const year = Number(campgroundToday().slice(0, 4)) - 1;

  const [camp] = await db
    .insert(schema.camps)
    .values({ name: E2E_CAMP_NAME, description: "Created by e2e tests" })
    .returning();
  await db.insert(schema.campYears).values({
    campId: camp.id,
    year,
    startDate: `${year}-07-01`,
    endDate: `${year}-07-03`,
    capacity: 10,
  });
  const [price] = await db
    .insert(schema.campYearPrices)
    .values({ name: "E2E Price", campId: camp.id, year, price: 10000 })
    .returning();
  const [camper] = await db
    .insert(schema.campers)
    .values({ userId, ...E2E_CAMPER, dateOfBirth: "2015-06-01" })
    .returning();
  const [registration] = await db
    .insert(schema.registrations)
    .values({
      campId: camp.id,
      campYear: year,
      priceId: price.id,
      camperId: camper.id,
    })
    .returning();

  return { registrationId: registration.id };
}

export async function registrationExists(id: string) {
  const rows = await db
    .select({ id: schema.registrations.id })
    .from(schema.registrations)
    .where(eq(schema.registrations.id, id));
  return rows.length > 0;
}
