"use server";

import { and, desc, eq } from "drizzle-orm";
import {
  adminAction,
  adminPanelAction,
  medicalAccessAction,
} from "@/lib/auth-helpers";
import { db } from "@/lib/data/db";
import { campers, campYears, registrations } from "@/lib/data/schema";
import type { AdminRegistration, AdminRegistrationDetail } from "./schema";

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

// Get registrations list (accessible to admin, hcp, staff)
export const getRegistrationsForAdmin = adminPanelAction(
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
