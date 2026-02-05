"use client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldSet } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useAppForm } from "@/hooks/use-camp-form";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { OTC_MEDICATIONS_LIST } from "@/lib/data/schema";
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
      height: medicalInfo?.height ?? "",
      weight: medicalInfo?.weight ?? "",

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
    onSubmit: async ({ value, formApi }) => {
      // 1. Submit to Server Action
      const toastId = toast.loading("Saving medical info...");
      try {
        await saveMedicalInfo(value);

        // 2. User Feedback
        toast.success(`Saved info for ${data.camper.firstName}`, {
          id: toastId, // This replaces the loading spinner with a checkmark
        });
        // Reset form with current values to update baseline and clear isDirty
        formApi.reset(value);
      } catch (err) {
        toast.error("Failed to save changes", {
          id: toastId,
        });
        console.error(err);
      }
    },
  });

  useUnsavedChangesWarning(() => !form.store.state.isDefaultValue);

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
              <form.StatusBadge schema={medicalInfoSchema} />
            </div>
          </CardHeader>

          <CardContent>
            <FieldSet name="medical-info" className="w-full min-w-0 grid gap-6">
              {/* --- SECTION 1: BASIC CONTACT --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.AppField name="healthCareNumber">
                  {(field) => (
                    <Field>
                      <field.Label>Health Care Number</field.Label>
                      <field.WithErrors>
                        <field.TextInput placeholder="XXXXX-XXXX" />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>
                <form.AppField name="familyDoctor">
                  {(field) => (
                    <Field>
                      <field.Label>Family Doctor</field.Label>
                      <field.WithErrors>
                        <field.TextInput />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>
                <form.AppField name="doctorPhone">
                  {(field) => (
                    <Field>
                      <field.Label>Doctor Phone</field.Label>
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
                  <div className="space-y-3 p-4 border rounded-md">
                    <div className="flex items-center justify-between gap-4">
                      <label
                        htmlFor={`alg-${camper.id}`}
                        className="font-medium text-sm"
                      >
                        Does {camper.firstName} have any allergies?
                      </label>
                      <div className="flex items-center gap-2 text-sm">
                        <Switch
                          id={`alg-${camper.id}`}
                          checked={field.state.value}
                          onCheckedChange={field.handleChange}
                        />
                        <span className="font-medium w-7">
                          {field.state.value ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>

                    {field.state.value && (
                      <form.AppField name="allergiesDetails">
                        {(subField) => (
                          <Field>
                            <subField.Label>
                              Please list all allergies
                            </subField.Label>
                            <subField.WithErrors>
                              <subField.TextArea />
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
                  <div className="space-y-3 p-4 border rounded-md">
                    <div className="flex items-center justify-between gap-4">
                      <label
                        htmlFor={`meds-${camper.id}`}
                        className="font-medium text-sm"
                      >
                        Will {camper.firstName} take medications at camp?
                      </label>
                      <div className="flex items-center gap-2 text-sm">
                        <Switch
                          id={`meds-${camper.id}`}
                          checked={field.state.value}
                          onCheckedChange={field.handleChange}
                        />
                        <span className="font-medium w-7">
                          {field.state.value ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>

                    {field.state.value && (
                      <form.AppField name="medicationsAtCampDetails">
                        {(subField) => (
                          <Field>
                            <subField.Label>
                              List medications & dosage
                            </subField.Label>
                            <subField.WithErrors>
                              <subField.TextArea />
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
                  <div className="space-y-3 p-4 border rounded-md">
                    <div className="flex items-center justify-between gap-4">
                      <label
                        htmlFor={`cond-${camper.id}`}
                        className="font-medium text-sm"
                      >
                        Any other medical conditions? (e.g. ADHD, Sleepwalking)
                      </label>
                      <div className="flex items-center gap-2 text-sm">
                        <Switch
                          id={`cond-${camper.id}`}
                          checked={field.state.value}
                          onCheckedChange={field.handleChange}
                        />
                        <span className="font-medium w-7">
                          {field.state.value ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>

                    {field.state.value && (
                      <form.AppField name="medicalConditionsDetails">
                        {(subField) => (
                          <Field>
                            <subField.Label>Please describe</subField.Label>
                            <subField.WithErrors>
                              <subField.TextArea />
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
                {(field) => {
                  const allSelected =
                    field.state.value.length === OTC_MEDICATIONS_LIST.length;
                  return (
                    <div className="border rounded-md p-4">
                      <field.Label className="mb-2 block">
                        Allowed Over-the-Counter Medications
                      </field.Label>
                      <p className="text-xs text-muted-foreground mb-4">
                        Check all that the camp nurse is allowed to administer.
                      </p>
                      <label className="flex items-center gap-2 text-sm font-medium mb-3 pb-3 border-b">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => {
                            field.handleChange(
                              e.target.checked ? [...OTC_MEDICATIONS_LIST] : [],
                            );
                          }}
                          className="rounded border-gray-300"
                        />
                        Allow All
                      </label>
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
                  );
                }}
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
