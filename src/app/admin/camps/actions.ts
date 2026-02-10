"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import {
  camps,
  campYearPrices,
  campYears,
  registrations,
} from "@/lib/data/schema";
import {
  type BatchUpdatePricesForm,
  batchUpdatePricesSchema,
  type CampInsertForm,
  type CampUpdateForm,
  type CampYearInsertForm,
  type CampYearUpdateForm,
  type CreateCampWithYearAndPricesForm,
  campInsertSchema,
  campUpdateSchema,
  campYearInsertSchema,
  campYearUpdateSchema,
  createCampWithYearAndPricesSchema,
} from "@/lib/types/camp-schemas";

// ============ CAMP ACTIONS ============

export async function createCamp(data: CampInsertForm) {
  await requireAdmin();

  const validated = campInsertSchema.parse(data);

  const [newCamp] = await db
    .insert(camps)
    .values({
      name: validated.name,
      description: validated.description,
    })
    .returning();

  revalidatePath("/admin/camps");
  return newCamp;
}

export async function createCampWithYear(
  data: CreateCampWithYearAndPricesForm,
) {
  await requireAdmin();

  const validated = createCampWithYearAndPricesSchema.parse(data);

  return await db.transaction(async (tx) => {
    const [newCamp] = await tx
      .insert(camps)
      .values({
        name: validated.name,
        description: validated.description,
      })
      .returning();

    const [newCampYear] = await tx
      .insert(campYears)
      .values({
        campId: newCamp.id,
        year: validated.year,
        capacity: validated.capacity ?? null,
        startDate: validated.startDate,
        endDate: validated.endDate,
      })
      .returning();

    // Insert prices for the camp year
    const newPrices = await tx
      .insert(campYearPrices)
      .values(
        validated.prices.map((price) => ({
          name: price.name,
          campId: newCamp.id,
          year: validated.year,
          price: price.price,
          isDayPrice: price.isDayPrice,
        })),
      )
      .returning();

    revalidatePath("/admin/camps");
    return { camp: newCamp, campYear: newCampYear, prices: newPrices };
  });
}

export async function updateCamp(data: CampUpdateForm) {
  await requireAdmin();

  const validated = campUpdateSchema.parse(data);

  const [updatedCamp] = await db
    .update(camps)
    .set({
      name: validated.name,
      description: validated.description,
    })
    .where(eq(camps.id, validated.id))
    .returning();

  if (!updatedCamp) {
    throw new Error("Camp not found");
  }

  revalidatePath("/admin/camps");
  return updatedCamp;
}

export async function deleteCamp(campId: string) {
  await requireAdmin();

  // Check if there are any registrations for this camp
  const existingRegistrations = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(eq(registrations.campId, campId))
    .limit(1);

  if (existingRegistrations.length > 0) {
    throw new Error(
      "Cannot delete camp: There are existing registrations. Please delete or reassign registrations first.",
    );
  }

  // Delete all campYears first (due to FK constraint)
  await db.delete(campYears).where(eq(campYears.campId, campId));

  // Delete the camp
  const [deletedCamp] = await db
    .delete(camps)
    .where(eq(camps.id, campId))
    .returning();

  if (!deletedCamp) {
    throw new Error("Camp not found");
  }

  revalidatePath("/admin/camps");
  return deletedCamp;
}

// ============ CAMP YEAR ACTIONS ============

export async function createCampYear(data: CampYearInsertForm) {
  await requireAdmin();

  const validated = campYearInsertSchema.parse(data);

  // Check if camp exists
  const camp = await db
    .select({ id: camps.id })
    .from(camps)
    .where(eq(camps.id, validated.campId))
    .limit(1);

  if (camp.length === 0) {
    throw new Error("Camp not found");
  }

  // Check if year already exists for this camp
  const existingYear = await db
    .select({ year: campYears.year })
    .from(campYears)
    .where(
      and(
        eq(campYears.campId, validated.campId),
        eq(campYears.year, validated.year),
      ),
    )
    .limit(1);

  if (existingYear.length > 0) {
    throw new Error(`Camp year ${validated.year} already exists for this camp`);
  }

  const [newCampYear] = await db
    .insert(campYears)
    .values({
      campId: validated.campId,
      year: validated.year,
      capacity: validated.capacity ?? null,
      startDate: validated.startDate,
      endDate: validated.endDate,
    })
    .returning();

  revalidatePath("/admin/camps");
  return newCampYear;
}

export async function updateCampYear(data: CampYearUpdateForm) {
  await requireAdmin();

  const validated = campYearUpdateSchema.parse(data);

  const [updatedCampYear] = await db
    .update(campYears)
    .set({
      capacity: validated.capacity ?? null,
      startDate: validated.startDate,
      endDate: validated.endDate,
    })
    .where(
      and(
        eq(campYears.campId, validated.campId),
        eq(campYears.year, validated.year),
      ),
    )
    .returning();

  if (!updatedCampYear) {
    throw new Error("Camp year not found");
  }

  revalidatePath("/admin/camps");
  return updatedCampYear;
}

export async function deleteCampYear(campId: string, year: number) {
  await requireAdmin();

  // Check if there are any registrations for this camp year
  const existingRegistrations = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(
      and(eq(registrations.campId, campId), eq(registrations.campYear, year)),
    )
    .limit(1);

  if (existingRegistrations.length > 0) {
    throw new Error(
      `Cannot delete camp year ${year}: There are existing registrations. Please delete or reassign registrations first.`,
    );
  }

  const [deletedCampYear] = await db
    .delete(campYears)
    .where(and(eq(campYears.campId, campId), eq(campYears.year, year)))
    .returning();

  if (!deletedCampYear) {
    throw new Error("Camp year not found");
  }

  revalidatePath("/admin/camps");
  return deletedCampYear;
}

// ============ CAMP YEAR PRICE ACTIONS ============

export async function batchUpdatePrices(data: BatchUpdatePricesForm) {
  await requireAdmin();

  const validated = batchUpdatePricesSchema.parse(data);

  return await db.transaction(async (tx) => {
    // Get existing prices for this camp year
    const existingPrices = await tx
      .select({ id: campYearPrices.id })
      .from(campYearPrices)
      .where(
        and(
          eq(campYearPrices.campId, validated.campId),
          eq(campYearPrices.year, validated.year),
        ),
      );

    const existingPriceIds = new Set(existingPrices.map((p) => p.id));
    const incomingPriceIds = new Set(
      validated.prices.filter((p) => p.id).map((p) => p.id as string),
    );

    // Find prices to delete (exist in DB but not in incoming)
    const priceIdsToDelete = [...existingPriceIds].filter(
      (id) => !incomingPriceIds.has(id),
    );

    // Check if any prices being deleted have registrations
    if (priceIdsToDelete.length > 0) {
      const registrationsUsingPrices = await tx
        .select({ id: registrations.id, priceId: registrations.priceId })
        .from(registrations)
        .where(
          and(
            eq(registrations.campId, validated.campId),
            eq(registrations.campYear, validated.year),
          ),
        );

      const usedPriceIds = registrationsUsingPrices
        .map((r) => r.priceId)
        .filter((id) => priceIdsToDelete.includes(id));

      if (usedPriceIds.length > 0) {
        throw new Error(
          "Cannot delete prices that have existing registrations. Please reassign or delete registrations first.",
        );
      }

      // Delete prices that are no longer in the list
      for (const priceId of priceIdsToDelete) {
        await tx.delete(campYearPrices).where(eq(campYearPrices.id, priceId));
      }
    }

    // Update existing prices and insert new ones
    const results = [];
    for (const price of validated.prices) {
      if (price.id && existingPriceIds.has(price.id)) {
        // Update existing price
        const [updated] = await tx
          .update(campYearPrices)
          .set({
            name: price.name,
            price: price.price,
            isDayPrice: price.isDayPrice,
          })
          .where(eq(campYearPrices.id, price.id))
          .returning();
        results.push(updated);
      } else {
        // Insert new price
        const [inserted] = await tx
          .insert(campYearPrices)
          .values({
            name: price.name,
            campId: validated.campId,
            year: validated.year,
            price: price.price,
            isDayPrice: price.isDayPrice,
          })
          .returning();
        results.push(inserted);
      }
    }

    revalidatePath("/admin/camps");
    return results;
  });
}

export async function deleteCampYearPrice(priceId: string) {
  await requireAdmin();

  // Check if there are any registrations using this price
  const existingRegistrations = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(eq(registrations.priceId, priceId))
    .limit(1);

  if (existingRegistrations.length > 0) {
    throw new Error(
      "Cannot delete price: There are existing registrations using this price. Please reassign or delete registrations first.",
    );
  }

  const [deletedPrice] = await db
    .delete(campYearPrices)
    .where(eq(campYearPrices.id, priceId))
    .returning();

  if (!deletedPrice) {
    throw new Error("Price not found");
  }

  revalidatePath("/admin/camps");
  return deletedPrice;
}
