/**
 * Server-side validation functions for determining registration completeness.
 * These are used to check if a registration is ready for payment.
 */

type CamperData = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  addressId: string | null;
  gender: string | null;
  shirtSize: string | null;
  swimmingLevel: string | null;
};

type RegistrationData = {
  id: string;
  campId: string;
  campYear: number;
  status: "draft" | "registered" | "refunded";
};

type MedicalInfoData = {
  camperId: string;
  healthCareNumber: string;
  familyDoctor: string;
  doctorPhone: string;
} | null;

type EmergencyContactAssignment = {
  camperId: string;
  emergencyContactId: string;
};

type RegistrationDetailsData = {
  parentSignature: string | null;
} | null;

export type IncompleteStep = {
  step: string; // URL segment: "camper", "camp", "medical-info", "emergency-contact"
  label: string; // Display label
};

export type RegistrationCompleteness = {
  isComplete: boolean;
  incompleteSteps: IncompleteStep[];
};

/**
 * Validates that the overview step is complete.
 * Requires: first name, last name, date of birth, and a camp selected
 */
export function validateOverviewStep(
  camper: CamperData,
  registration: RegistrationData,
): boolean {
  return !!(
    camper.firstName?.trim() &&
    camper.lastName?.trim() &&
    camper.dateOfBirth &&
    registration.campId
  );
}

/**
 * Validates that the camper info step is complete.
 * Requires: gender, shirt size (addressId is optional per form schema)
 */
export function validateCamperInfoStep(camper: CamperData): boolean {
  return !!(camper.gender?.trim() && camper.shirtSize?.trim());
}

/**
 * Validates that the medical info step is complete.
 * Requires: health care number, family doctor, doctor phone
 */
export function validateMedicalInfoStep(medicalInfo: MedicalInfoData): boolean {
  return !!(
    medicalInfo &&
    medicalInfo.healthCareNumber?.trim() &&
    medicalInfo.familyDoctor?.trim() &&
    medicalInfo.doctorPhone?.trim()
  );
}

/**
 * Validates that the emergency contacts step is complete.
 * Requires: at least one emergency contact assigned to the camper
 */
export function validateEmergencyContactsStep(
  emergencyContacts: EmergencyContactAssignment[],
): boolean {
  return emergencyContacts.length > 0;
}

/**
 * Validates that the camp info step is complete.
 * Requires: signature (for both minors and adults)
 */
export function validateCampInfoStep(
  registrationDetails: RegistrationDetailsData,
): boolean {
  return !!registrationDetails?.parentSignature?.trim();
}

/**
 * Full registration data type for completeness checking
 */
export type FullRegistrationData = {
  registration: RegistrationData;
  camper: CamperData;
  medicalInfo: MedicalInfoData;
  emergencyContacts: EmergencyContactAssignment[];
  registrationDetails: RegistrationDetailsData;
};

/**
 * Checks the completeness of a registration across all form steps.
 * Returns which steps are incomplete (if any).
 */
export function getRegistrationCompleteness(
  data: FullRegistrationData,
): RegistrationCompleteness {
  const incompleteSteps: IncompleteStep[] = [];

  // Check each step
  if (!validateOverviewStep(data.camper, data.registration)) {
    incompleteSteps.push({ step: "overview", label: "Overview" });
  }

  if (!validateCamperInfoStep(data.camper)) {
    incompleteSteps.push({ step: "camper", label: "Camper Info" });
  }

  if (!validateCampInfoStep(data.registrationDetails)) {
    incompleteSteps.push({ step: "camp", label: "Camp Info" });
  }

  if (!validateMedicalInfoStep(data.medicalInfo)) {
    incompleteSteps.push({ step: "medical-info", label: "Medical Info" });
  }

  if (!validateEmergencyContactsStep(data.emergencyContacts)) {
    incompleteSteps.push({
      step: "emergency-contact",
      label: "Emergency Contacts",
    });
  }

  return {
    isComplete: incompleteSteps.length === 0,
    incompleteSteps,
  };
}

/**
 * Derives the display status from registration data and completeness.
 */
export type CheckoutStatus = "incomplete" | "ready" | "paid" | "refunded";

export function getCheckoutStatus(
  registrationStatus: "draft" | "registered" | "refunded",
  completeness: RegistrationCompleteness,
): CheckoutStatus {
  if (registrationStatus === "registered") {
    return "paid";
  }

  if (registrationStatus === "refunded") {
    return "refunded";
  }

  // Draft registration
  return completeness.isComplete ? "ready" : "incomplete";
}
