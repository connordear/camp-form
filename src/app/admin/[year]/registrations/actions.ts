"use server";

import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { adminPanelAction, medicalAccessAction } from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import {
  campers,
  camps,
  campYearPrices,
  campYears,
  registrations,
} from "@/lib/data/schema";
import type { AdminRegistration, AdminRegistrationDetail } from "./schema";

export interface GetRegistrationsParams {
  year: number;
  search?: string;
  status?: string;
  camp?: string;
  page?: number;
  pageSize?: number;
}

export interface StatusCounts {
  registered: number;
  draft: number;
  refunded: number;
}

export interface GetRegistrationsResult {
  registrations: AdminRegistration[];
  totalCount: number;
  totalPages: number;
  statusCounts: StatusCounts;
}

// Get registrations list (accessible to admin, hcp, staff)
export const getRegistrationsForAdmin = adminPanelAction(
  async (params: GetRegistrationsParams): Promise<GetRegistrationsResult> => {
    const { year, search, status, camp, page = 1, pageSize = 10 } = params;

    // Build base where conditions
    const conditions = [eq(registrations.campYear, year)];

    if (status && status !== "all") {
      conditions.push(
        eq(registrations.status, status as "draft" | "registered" | "refunded"),
      );
    }

    if (camp && camp !== "all") {
      conditions.push(eq(registrations.campId, camp));
    }

    // Add search condition if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(campers.firstName, searchTerm),
          ilike(campers.lastName, searchTerm),
          ilike(camps.name, searchTerm),
        )!,
      );
    }

    const whereClause = and(...conditions);

    // Query 1: Get total count and status counts in one query
    const countResult = await db
      .select({
        status: registrations.status,
        count: count(),
      })
      .from(registrations)
      .innerJoin(campers, eq(registrations.camperId, campers.id))
      .innerJoin(
        campYears,
        and(
          eq(registrations.campId, campYears.campId),
          eq(registrations.campYear, campYears.year),
        ),
      )
      .innerJoin(camps, eq(campYears.campId, camps.id))
      .where(whereClause)
      .groupBy(registrations.status);

    const statusCounts: StatusCounts = { registered: 0, draft: 0, refunded: 0 };
    let totalCount = 0;
    for (const row of countResult) {
      totalCount += row.count;
      if (row.status === "registered") statusCounts.registered = row.count;
      else if (row.status === "draft") statusCounts.draft = row.count;
      else if (row.status === "refunded") statusCounts.refunded = row.count;
    }

    const totalPages = Math.ceil(totalCount / pageSize);

    // Query 2: Get paginated registrations with flat select
    const flatResults = await db
      .select({
        id: registrations.id,
        campId: registrations.campId,
        campYear: registrations.campYear,
        priceId: registrations.priceId,
        camperId: registrations.camperId,
        numDays: registrations.numDays,
        pricePaid: registrations.pricePaid,
        status: registrations.status,
        stripePaymentIntentId: registrations.stripePaymentIntentId,
        stripeSessionId: registrations.stripeSessionId,
        createdAt: registrations.createdAt,
        updatedAt: registrations.updatedAt,
        camperId_col: campers.id,
        camperFirstName: campers.firstName,
        camperLastName: campers.lastName,
        camperUserId: campers.userId,
        campYearYear: campYears.year,
        campYearCampId: campYears.campId,
        campId_col: camps.id,
        campName: camps.name,
        priceId_col: campYearPrices.id,
        priceName: campYearPrices.name,
        pricePrice: campYearPrices.price,
      })
      .from(registrations)
      .innerJoin(campers, eq(registrations.camperId, campers.id))
      .innerJoin(
        campYears,
        and(
          eq(registrations.campId, campYears.campId),
          eq(registrations.campYear, campYears.year),
        ),
      )
      .innerJoin(camps, eq(campYears.campId, camps.id))
      .innerJoin(
        campYearPrices,
        and(
          eq(registrations.priceId, campYearPrices.id),
          eq(registrations.campId, campYearPrices.campId),
          eq(registrations.campYear, campYearPrices.year),
        ),
      )
      .where(whereClause)
      .orderBy(desc(registrations.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // Transform flat results to nested structure
    const paginatedData = flatResults.map((row) => ({
      id: row.id,
      campId: row.campId,
      priceId: row.priceId,
      camperId: row.camperId,
      numDays: row.numDays,
      pricePaid: row.pricePaid,
      status: row.status,
      stripePaymentIntentId: row.stripePaymentIntentId,
      stripeSessionId: row.stripeSessionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      camper: {
        id: row.camperId_col,
        firstName: row.camperFirstName,
        lastName: row.camperLastName,
        userId: row.camperUserId,
      },
      campYear: {
        year: row.campYearYear,
        campId: row.campYearCampId,
        camp: {
          id: row.campId_col,
          name: row.campName,
        },
      },
      price: {
        id: row.priceId_col,
        name: row.priceName,
        price: row.pricePrice,
      },
    }));

    return {
      registrations: paginatedData as AdminRegistration[],
      totalCount,
      totalPages,
      statusCounts,
    };
  },
);

export const getAvailableCamps = adminPanelAction(
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

// Get full registration details (accessible to admin, hcp, staff)
// Returns registration with full camper info, address, emergency contacts, and registration details
export const getRegistrationDetail = adminPanelAction(
  async (registrationId: string): Promise<AdminRegistrationDetail | null> => {
    const registration = await db.query.registrations.findFirst({
      where: eq(registrations.id, registrationId),
      with: {
        camper: {
          with: {
            address: true,
          },
        },
        campYear: {
          with: {
            camp: true,
          },
        },
        price: true,
        details: true,
      },
    });

    if (!registration) {
      return null;
    }

    // Get emergency contacts separately
    const camperWithContacts = await db.query.campers.findFirst({
      where: eq(campers.id, registration.camperId),
      with: {
        emergencyContacts: {
          with: {
            emergencyContact: true,
          },
          orderBy: (contacts, { asc }) => [asc(contacts.priority)],
        },
      },
    });

    // Transform to AdminRegistrationDetail
    const detail: AdminRegistrationDetail = {
      ...registration,
      camper: {
        id: registration.camper.id,
        firstName: registration.camper.firstName,
        lastName: registration.camper.lastName,
        userId: registration.camper.userId,
        dateOfBirth: registration.camper.dateOfBirth,
        gender: registration.camper.gender,
        shirtSize: registration.camper.shirtSize,
        swimmingLevel: registration.camper.swimmingLevel,
        hasBeenToCamp: registration.camper.hasBeenToCamp,
        arePhotosAllowed: registration.camper.arePhotosAllowed,
        dietaryRestrictions: registration.camper.dietaryRestrictions,
        address: registration.camper.address,
      },
      emergencyContacts:
        camperWithContacts?.emergencyContacts.map((ec) => ({
          priority: ec.priority,
          emergencyContact: {
            id: ec.emergencyContact.id,
            name: ec.emergencyContact.name,
            phone: ec.emergencyContact.phone,
            email: ec.emergencyContact.email,
            relationship: ec.emergencyContact.relationship,
            relationshipOther: ec.emergencyContact.relationshipOther,
          },
        })) ?? [],
      details: registration.details ?? undefined,
    };

    return detail;
  },
);

// Get medical info for a registration (admin and hcp only)
export const getRegistrationMedicalInfo = medicalAccessAction(
  async (registrationId: string) => {
    const registration = await db.query.registrations.findFirst({
      where: eq(registrations.id, registrationId),
      with: {
        camper: {
          with: {
            medicalInfo: true,
          },
        },
      },
    });

    if (!registration || !registration.camper.medicalInfo) {
      return null;
    }

    return {
      healthCareNumber: registration.camper.medicalInfo.healthCareNumber,
      familyDoctor: registration.camper.medicalInfo.familyDoctor,
      doctorPhone: registration.camper.medicalInfo.doctorPhone,
      height: registration.camper.medicalInfo.height,
      weight: registration.camper.medicalInfo.weight,
      hasAllergies: registration.camper.medicalInfo.hasAllergies,
      allergiesDetails: registration.camper.medicalInfo.allergiesDetails,
      usesEpiPen: registration.camper.medicalInfo.usesEpiPen,
      hasMedicationsAtCamp:
        registration.camper.medicalInfo.hasMedicationsAtCamp,
      medicationsAtCampDetails:
        registration.camper.medicalInfo.medicationsAtCampDetails,
      hasMedicationsNotAtCamp:
        registration.camper.medicalInfo.hasMedicationsNotAtCamp,
      medicationsNotAtCampDetails:
        registration.camper.medicalInfo.medicationsNotAtCampDetails,
      otcPermissions: registration.camper.medicalInfo.otcPermissions,
      hasMedicalConditions:
        registration.camper.medicalInfo.hasMedicalConditions,
      medicalConditionsDetails:
        registration.camper.medicalInfo.medicalConditionsDetails,
      additionalInfo: registration.camper.medicalInfo.additionalInfo,
    };
  },
);
