import { asc, desc, eq } from "drizzle-orm";
import { db } from "../data/db";
import { camps, campYears } from "../data/schema";

/**
 * Get all distinct years from the campYears table, sorted descending
 */
export async function getAvailableYears(): Promise<number[]> {
  const results = await db
    .selectDistinct({ year: campYears.year })
    .from(campYears)
    .orderBy(desc(campYears.year));

  return results.map((r) => r.year);
}

/**
 * Get all camps with their campYear data for a specific year
 * Camps without data for that year will have campYear as undefined
 */
export async function getCampsForYear(year: number) {
  const allCamps = await db.query.camps.findMany({
    orderBy: asc(camps.name),
    with: {
      campYears: {
        where: eq(campYears.year, year),
      },
    },
  });

  return allCamps.map((camp) => ({
    ...camp,
    campYear: camp.campYears[0] ?? null,
  }));
}

/**
 * Get a single camp by ID with all its years
 */
export async function getCampById(id: string) {
  return await db.query.camps.findFirst({
    where: eq(camps.id, id),
    with: {
      campYears: {
        orderBy: desc(campYears.year),
      },
    },
  });
}

/**
 * Get all camps (without year data)
 */
export async function getAllCamps() {
  return await db.query.camps.findMany({
    orderBy: asc(camps.name),
  });
}

export type CampWithYear = Awaited<ReturnType<typeof getCampsForYear>>[number];
export type CampYear = NonNullable<CampWithYear["campYear"]>;
