"use client";
import { useStore } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import FormStatusBadge from "@/components/forms/form-status-badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { useAppForm } from "@/hooks/use-camp-form";
import { OTC_MEDICATIONS_LIST } from "@/lib/data/schema";
import type { FormStatus } from "@/lib/types/common-types";
import { saveMedicalInfo } from "./actions";
import { type CamperWithMedicalInfo, medicalInfoSchema } from "./schema";

// Assuming you have a type for the Camper that includes the medical info relation
type MedicalInfoFieldProps = {
  data: CamperWithMedicalInfo;
};

export default function MedicalInfoField({ data }: MedicalInfoFieldProps) {
  const { camper, medicalInfo } = data;

  const form = useAppForm({
    defaultValues: {
      camperId: camper.id,
      healthCareNumber: medicalInfo?.healthCareNumber ?? "",
      familyDoctor: medicalInfo?.familyDoctor ?? "",
      doctorPhone: medicalInfo?.doctorPhone ?? "",

      hasAllergies: medicalInfo?.hasAllergies ?? false,
      allergiesDetails: medicalInfo?.allergiesDetails ?? "",
      hasMedicationsAtCamp: medicalInfo?.hasMedicationsAtCamp ?? false,
      medicationsAtCampDetails: medicalInfo?.medicationsAtCampDetails ?? "",
      hasMedicalConditions: medicalInfo?.hasMedicalConditions ?? false,
      medicalConditionsDetails: medicalInfo?.medicalConditionsDetails ?? "",
      otcPermissions: medicalInfo?.otcPermissions ?? [],
      additionalInfo: medicalInfo?.additionalInfo ?? "",

      // IMPORTANT: Explicitly set "Logic Gates" to false if null
      // This prevents "uncontrolled to controlled" React warnings
      hasMedicationsNotAtCamp: medicalInfo?.hasMedicationsNotAtCamp ?? false,
      medicationsNotAtCampDetails:
        medicalInfo?.medicationsNotAtCampDetails ?? "",
      usesEpiPen: medicalInfo?.usesEpiPen ?? false,
    },
    validators: {
      onSubmit: medicalInfoSchema,
    },
    onSubmit: async ({ value }) => {
      // 1. Submit to Server Action
      const toastId = toast.loading("Saving medical info...");
      try {
        await saveMedicalInfo(value);

        // 2. User Feedback
        toast.success(`Saved info for ${data.camper.firstName}`, {
          id: toastId, // This replaces the loading spinner with a checkmark
        });
        setStatus("complete");
      } catch (err) {
        toast.error("Failed to save changes", {
          id: toastId,
        });
        console.error(err);
      }
    },
  });

  const hasSubmitted = useStore(form.store, (s) => s.isSubmitted);

  // Status is complete if we have a record ID (meaning it exists in DB)
  const [status, setStatus] = useState<FormStatus>(
    medicalInfo?.camperId ? "complete" : "draft",
  );

  useEffect(() => {
    hasSubmitted && setStatus("complete");
  }, [hasSubmitted]);

  return (
    <form.AppForm>
      <Card className="w-full max-w-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-3"
        >
          <CardHeader>
            <div className="flex gap-3 justify-between items-center">
              <CardTitle className="truncate">
                Medical Info - {camper.firstName} {camper.lastName}
              </CardTitle>
              <FormStatusBadge status={status} />
            </div>
          </CardHeader>

          <CardContent>
            <FieldSet className="w-full min-w-0 grid gap-6">
              {/* --- SECTION 1: BASIC CONTACT --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.AppField name="healthCareNumber">
                  {(field) => (
                    <Field>
                      <FieldLabel>Health Care Number</FieldLabel>
                      <field.WithErrors>
                        <field.TextInput placeholder="XXXXX-XXXX" />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>
                <form.AppField name="familyDoctor">
                  {(field) => (
                    <Field>
                      <FieldLabel>Family Doctor</FieldLabel>
                      <field.WithErrors>
                        <field.TextInput />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>
                <form.AppField name="doctorPhone">
                  {(field) => (
                    <Field>
                      <FieldLabel>Doctor Phone</FieldLabel>
                      <field.WithErrors>
                        <field.TextInput type="tel" />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>
              </div>

              {/* --- SECTION 2: CONDITIONAL QUESTIONS --- */}

              {/* ALLERGIES */}
              <form.AppField name="hasAllergies">
                {(field) => (
                  <div className="space-y-3 p-4 border rounded-md bg-slate-50">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`alg-${camper.id}`}
                        checked={field.state.value}
                        onChange={(e) => field.handleChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label
                        htmlFor={`alg-${camper.id}`}
                        className="font-medium text-sm"
                      >
                        Does {camper.firstName} have any allergies?
                      </label>
                    </div>

                    {field.state.value && (
                      <form.AppField name="allergiesDetails">
                        {(subField) => (
                          <Field>
                            <FieldLabel>Please list all allergies</FieldLabel>
                            <subField.WithErrors>
                              <subField.TextInput />
                              {/* Or use <textarea> logic if available in your TextInput */}
                            </subField.WithErrors>
                          </Field>
                        )}
                      </form.AppField>
                    )}
                  </div>
                )}
              </form.AppField>

              {/* MEDICATIONS */}
              <form.AppField name="hasMedicationsAtCamp">
                {(field) => (
                  <div className="space-y-3 p-4 border rounded-md bg-slate-50">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`meds-${camper.id}`}
                        checked={field.state.value}
                        onChange={(e) => field.handleChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label
                        htmlFor={`meds-${camper.id}`}
                        className="font-medium text-sm"
                      >
                        Will {camper.firstName} take medications at camp?
                      </label>
                    </div>

                    {field.state.value && (
                      <form.AppField name="medicationsAtCampDetails">
                        {(subField) => (
                          <Field>
                            <FieldLabel>List medications & dosage</FieldLabel>
                            <subField.WithErrors>
                              <subField.TextInput />
                            </subField.WithErrors>
                          </Field>
                        )}
                      </form.AppField>
                    )}
                  </div>
                )}
              </form.AppField>

              {/* MEDICAL CONDITIONS */}
              <form.AppField name="hasMedicalConditions">
                {(field) => (
                  <div className="space-y-3 p-4 border rounded-md bg-slate-50">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`cond-${camper.id}`}
                        checked={field.state.value}
                        onChange={(e) => field.handleChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label
                        htmlFor={`cond-${camper.id}`}
                        className="font-medium text-sm"
                      >
                        Any other medical conditions? (e.g. ADHD, Sleepwalking)
                      </label>
                    </div>

                    {field.state.value && (
                      <form.AppField name="medicalConditionsDetails">
                        {(subField) => (
                          <Field>
                            <FieldLabel>Please describe</FieldLabel>
                            <subField.WithErrors>
                              <subField.TextInput />
                            </subField.WithErrors>
                          </Field>
                        )}
                      </form.AppField>
                    )}
                  </div>
                )}
              </form.AppField>

              {/* --- SECTION 3: OTC MEDICATIONS --- */}
              <form.AppField name="otcPermissions">
                {(field) => (
                  <div className="border rounded-md p-4">
                    <FieldLabel className="mb-2 block">
                      Allowed Over-the-Counter Medications
                    </FieldLabel>
                    <p className="text-xs text-muted-foreground mb-4">
                      Check all that the camp nurse is allowed to administer.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {OTC_MEDICATIONS_LIST.map((med) => (
                        <label
                          key={med}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={field.state.value.includes(med)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              const current = field.state.value;
                              field.handleChange(
                                isChecked
                                  ? [...current, med]
                                  : current.filter((m) => m !== med),
                              );
                            }}
                            className="rounded border-gray-300"
                          />
                          {med}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </form.AppField>
            </FieldSet>
          </CardContent>

          <CardFooter>
            <form.SubmitButton
              name="Save Medical Info"
              onClick={() => form.handleSubmit()}
            >
              Save Medical Info
            </form.SubmitButton>
          </CardFooter>
        </form>
      </Card>
    </form.AppForm>
  );
}
