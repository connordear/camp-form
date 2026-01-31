"use server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/data/db";
import { camps, campYears, registrations } from "@/lib/data/schema";
import {
  type CampInsertForm,
  type CampUpdateForm,
  type CampYearInsertForm,
  type CampYearUpdateForm,
  type CreateCampWithYearForm,
  campInsertSchema,
  campUpdateSchema,
  campYearInsertSchema,
  campYearUpdateSchema,
  createCampWithYearSchema,
} from "@/lib/types/camp-schemas";

async function requireAdmin() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return sessionClaims;
}

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

export async function createCampWithYear(data: CreateCampWithYearForm) {
  await requireAdmin();

  const validated = createCampWithYearSchema.parse(data);

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

    revalidatePath("/admin/camps");
    return { camp: newCamp, campYear: newCampYear };
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
