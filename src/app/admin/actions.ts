"use server";

import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { adminAction } from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import { campYears } from "@/lib/data/schema";

export const getAvailableYears = adminAction(async (): Promise<number[]> => {
  const yearsData = await db.query.campYears.findMany({
    orderBy: desc(campYears.year),
    columns: { year: true },
  });

  const years = [...new Set(yearsData.map((y) => y.year))].sort(
    (a, b) => b - a,
  );

  // If no years in database, use current year
  if (years.length === 0) {
    years.push(new Date().getFullYear());
  }

  return years;
});

export const redirectToCurrentYear = adminAction(async (): Promise<never> => {
  const currentYear = new Date().getFullYear();
  redirect(`/admin/${currentYear}/registrations`);
});
