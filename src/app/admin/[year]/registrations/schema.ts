import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import {
  addresses,
  campers,
  camps,
  campYearPrices,
  campYears,
  emergencyContacts,
  medicalInfo,
  registrationDetails,
  registrations,
} from "@/lib/data/schema";

// Base schemas from drizzle-zod
const baseCamperSchema = createSelectSchema(campers);
const baseCampSchema = createSelectSchema(camps);
const baseCampYearSchema = createSelectSchema(campYears);
const basePriceSchema = createSelectSchema(campYearPrices);
const baseRegistrationSchema = createSelectSchema(registrations);

// Extended schemas with relationships
const camperSelectSchema = baseCamperSchema.pick({
  id: true,
  firstName: true,
  lastName: true,
  userId: true,
});

const campSelectSchema = baseCampSchema.pick({
  id: true,
  name: true,
});

const campYearSelectSchema = baseCampYearSchema.pick({
  year: true,
  campId: true,
});

const priceSelectSchema = basePriceSchema.pick({
  id: true,
  name: true,
  price: true,
});

// AdminRegistration schema built from drizzle/zod
export const adminRegistrationSchema = baseRegistrationSchema.extend({
  camper: camperSelectSchema,
  campYear: campYearSelectSchema.extend({
    camp: campSelectSchema,
  }),
  price: priceSelectSchema.nullable(),
});

export type AdminRegistration = z.infer<typeof adminRegistrationSchema>;

// Extended schemas for modal with full details
const baseAddressSchema = createSelectSchema(addresses);
const baseMedicalInfoSchema = createSelectSchema(medicalInfo);
const baseEmergencyContactSchema = createSelectSchema(emergencyContacts);
const baseRegistrationDetailsSchema = createSelectSchema(registrationDetails);

// Full camper schema with address
const camperFullSchema = baseCamperSchema.pick({
  id: true,
  firstName: true,
  lastName: true,
  userId: true,
  dateOfBirth: true,
  gender: true,
  shirtSize: true,
  swimmingLevel: true,
  hasBeenToCamp: true,
  arePhotosAllowed: true,
  dietaryRestrictions: true,
});

const addressSelectSchema = baseAddressSchema.pick({
  addressLine1: true,
  addressLine2: true,
  city: true,
  stateProv: true,
  country: true,
  postalZip: true,
});

// Medical info schema
const medicalInfoSelectSchema = baseMedicalInfoSchema.pick({
  healthCareNumber: true,
  familyDoctor: true,
  doctorPhone: true,
  height: true,
  weight: true,
  hasAllergies: true,
  allergiesDetails: true,
  usesEpiPen: true,
  hasMedicationsAtCamp: true,
  medicationsAtCampDetails: true,
  hasMedicationsNotAtCamp: true,
  medicationsNotAtCampDetails: true,
  otcPermissions: true,
  hasMedicalConditions: true,
  medicalConditionsDetails: true,
  additionalInfo: true,
});

// Emergency contact schema
const emergencyContactSelectSchema = baseEmergencyContactSchema.pick({
  id: true,
  name: true,
  phone: true,
  email: true,
  relationship: true,
  relationshipOther: true,
});

// Registration details schema
const registrationDetailsSelectSchema = baseRegistrationDetailsSchema.pick({
  cabinRequest: true,
  parentSignature: true,
  additionalInfo: true,
});

// Extended type for modal with all data
export interface AdminRegistrationDetail extends AdminRegistration {
  camper: {
    id: string;
    firstName: string;
    lastName: string;
    userId: string;
    dateOfBirth: string;
    gender: string | null;
    shirtSize: string | null;
    swimmingLevel: string | null;
    hasBeenToCamp: boolean | null;
    arePhotosAllowed: boolean;
    dietaryRestrictions: string | null;
    address: z.infer<typeof addressSelectSchema> | null;
  };
  medicalInfo?: z.infer<typeof medicalInfoSelectSchema>;
  emergencyContacts: Array<{
    priority: number;
    emergencyContact: z.infer<typeof emergencyContactSelectSchema>;
  }>;
  details?: z.infer<typeof registrationDetailsSelectSchema>;
}
