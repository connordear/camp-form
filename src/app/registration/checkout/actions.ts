"use server";

import { auth } from "@clerk/nextjs/server";
import {
  type CheckoutStatus,
  getCheckoutStatus,
  getRegistrationCompleteness,
  type IncompleteStep,
} from "@/lib/registration-completeness";
import {
  type DiscountEvaluationResult,
  evaluateDiscounts,
  type RegistrationForDiscount,
} from "@/lib/services/discount-service";
import { getRegistrationsForCheckoutPage } from "@/lib/services/registration-service";

/**
 * Individual registration data for display.
 */
export type CheckoutRegistration = {
  id: string;
  camperId: string;
  campName: string;
  campDates: string;
  price: number; // in cents
  numDays: number | null;
  status: CheckoutStatus;
  incompleteSteps?: IncompleteStep[];
};

/**
 * Camper with their registrations grouped together.
 */
export type CheckoutCamper = {
  id: string;
  name: string;
  registrations: CheckoutRegistration[];
};

/**
 * Formats a date range string from start and end dates.
 */
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", {
    ...options,
    year: "numeric",
  });

  return `${startStr} - ${endStr}`;
}

/**
 * Server action to fetch all checkout data for the current user.
 * Returns campers with their registrations grouped together.
 */
export async function getCheckoutData(
  year: number = new Date().getFullYear(),
): Promise<CheckoutCamper[]> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not logged in");
  }

  const user = await getRegistrationsForCheckoutPage(userId, year);

  if (!user) {
    return [];
  }

  const checkoutCampers: CheckoutCamper[] = [];

  for (const camper of user.campers) {
    // Skip campers with no registrations for this year
    if (camper.registrations.length === 0) {
      continue;
    }

    const camperRegistrations: CheckoutRegistration[] = [];

    for (const registration of camper.registrations) {
      // Get completeness data
      // Note: registration.campYear is the relation object (due to `with`),
      // so we get the year integer from registration.campYear.year
      const completeness = getRegistrationCompleteness({
        registration: {
          id: registration.id,
          campId: registration.campId,
          campYear: registration.campYear.year,
          status: registration.status,
        },
        camper: {
          id: camper.id,
          firstName: camper.firstName,
          lastName: camper.lastName,
          dateOfBirth: camper.dateOfBirth,
          addressId: camper.addressId,
          gender: camper.gender,
          shirtSize: camper.shirtSize,
          swimmingLevel: camper.swimmingLevel,
        },
        medicalInfo: camper.medicalInfo ?? null,
        emergencyContacts: camper.emergencyContacts ?? [],
      });

      const status = getCheckoutStatus(registration.status, completeness);

      const campYear = registration.campYear;
      const price =
        registration.numDays && registration.price.isDayPrice
          ? registration.price.price * registration.numDays
          : registration.price.price;

      camperRegistrations.push({
        id: registration.id,
        camperId: camper.id,
        campName: campYear.camp.name,
        campDates: formatDateRange(campYear.startDate, campYear.endDate),
        price,
        numDays: registration.numDays,
        status,
        incompleteSteps:
          status === "incomplete" ? completeness.incompleteSteps : undefined,
      });
    }

    checkoutCampers.push({
      id: camper.id,
      name: `${camper.firstName} ${camper.lastName}`.trim() || "Unnamed Camper",
      registrations: camperRegistrations,
    });
  }

  return checkoutCampers;
}

/**
 * Evaluates which discounts apply to a set of selected registrations.
 * This is called dynamically as the user selects/deselects registrations.
 */
export async function evaluateCheckoutDiscounts(
  registrations: Array<{
    id: string;
    camperId: string;
    price: number;
    numDays: number | null;
  }>,
): Promise<DiscountEvaluationResult> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Not logged in");
  }

  // Convert to format expected by discount service
  const registrationsForDiscount: RegistrationForDiscount[] = registrations.map(
    (r) => ({
      camperId: r.camperId,
      price: r.price,
      quantity: r.numDays ?? 1,
    }),
  );

  return evaluateDiscounts(registrationsForDiscount);
}
