"use server";

import { and, desc, eq } from "drizzle-orm";
import { adminAction } from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import { campYears, registrations } from "@/lib/data/schema";
import type { AdminRegistration } from "./schema";

export interface GetRegistrationsParams {
  year: number;
  search?: string;
  status?: string;
  camp?: string;
  page?: number;
  pageSize?: number;
}

export interface GetRegistrationsResult {
  registrations: AdminRegistration[];
  totalCount: number;
  totalPages: number;
}

export const getRegistrationsForAdmin = adminAction(
  async (params: GetRegistrationsParams): Promise<GetRegistrationsResult> => {
    const { year, search, status, camp, page = 1, pageSize = 10 } = params;

    // Build where conditions
    const conditions = [eq(registrations.campYear, year)];

    if (status && status !== "all") {
      conditions.push(
        eq(registrations.status, status as "draft" | "registered" | "refunded"),
      );
    }

    if (camp && camp !== "all") {
      conditions.push(eq(registrations.campId, camp));
    }

    // Get all registrations matching year/status/camp (server-side filtering)
    let allRegistrations = await db.query.registrations.findMany({
      where: and(...conditions),
      orderBy: desc(registrations.createdAt),
      with: {
        camper: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
          },
        },
        campYear: {
          with: {
            camp: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
        price: {
          columns: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });

    // Client-side filtering for search text (camper name or camp name)
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      allRegistrations = allRegistrations.filter((reg) => {
        const camperName =
          `${reg.camper.firstName} ${reg.camper.lastName}`.toLowerCase();
        const campName = reg.campYear.camp.name.toLowerCase();
        return (
          camperName.includes(searchLower) || campName.includes(searchLower)
        );
      });
    }

    const totalCount = allRegistrations.length;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Apply pagination
    const paginatedRegistrations = allRegistrations.slice(
      (page - 1) * pageSize,
      page * pageSize,
    );

    return {
      registrations: paginatedRegistrations as AdminRegistration[],
      totalCount,
      totalPages,
    };
  },
);

export const getAvailableCamps = adminAction(
  async (year: number): Promise<{ id: string; name: string }[]> => {
    const campsData = await db.query.campYears.findMany({
      where: eq(campYears.year, year),
      with: {
        camp: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    const uniqueCamps = campsData
      .map((cy) => cy.camp)
      .filter(
        (camp, index, self) =>
          index === self.findIndex((c) => c.id === camp.id),
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    return uniqueCamps;
  },
);
