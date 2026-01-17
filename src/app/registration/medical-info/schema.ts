import type { InferSelectModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { campers, medicalInfo } from "@/lib/data/schema"; // Path to your Drizzle schema

export const medicalInfoSchema = createInsertSchema(medicalInfo, {
  // --- A. Fix Booleans (Required true/false, no nulls) ---
  hasAllergies: z.boolean(),
  usesEpiPen: z.boolean(),
  hasMedicationsAtCamp: z.boolean(),
  hasMedicationsNotAtCamp: z.boolean(),
  hasMedicalConditions: z.boolean(),

  // --- B. Fix Strings (Required strings, allow empty "" but no nulls) ---
  // We force these to z.string() so they match the defaultValues: ""
  allergiesDetails: z.string(),
  medicationsAtCampDetails: z.string(),
  medicationsNotAtCampDetails: z.string(),
  medicalConditionsDetails: z.string(),
  additionalInfo: z.string(),
  height: z.string(), // Assuming these are text in your DB
  weight: z.string(),

  // --- C. Existing Validations ---
  healthCareNumber: (schema) => schema.min(1, "Health Care Number is required"),
  familyDoctor: (schema) => schema.min(1, "Doctor's name is required"),
  doctorPhone: (schema) => schema.min(1, "Doctor's phone is required"),

  otcPermissions: z.array(z.string()),
}).superRefine((data, ctx) => {
  // --- D. Conditional Logic ---
  if (data.hasAllergies && !data.allergiesDetails) {
    ctx.addIssue({
      code: "custom",
      message: "Please list the allergies",
      path: ["allergiesDetails"],
    });
  }

  if (data.hasMedicationsAtCamp && !data.medicationsAtCampDetails) {
    ctx.addIssue({
      code: "custom",
      message: "Please list the medications needed at camp",
      path: ["medicationsAtCampDetails"],
    });
  }

  if (data.hasMedicalConditions && !data.medicalConditionsDetails) {
    ctx.addIssue({
      code: "custom",
      message: "Please describe the medical conditions",
      path: ["medicalConditionsDetails"],
    });
  }
});

export type MedicalInfoFormValues = z.infer<typeof medicalInfoSchema>;

export const medicalInfoSelectSchema = createSelectSchema(medicalInfo);
export const camperSelectSchema = createSelectSchema(campers);

export type MedicalInfoRecord = InferSelectModel<typeof medicalInfo>;
export type CamperRecord = InferSelectModel<typeof campers>;

export type CamperWithMedicalInfo = {
  camper: CamperRecord;
  medicalInfo: MedicalInfoRecord | null;
};
