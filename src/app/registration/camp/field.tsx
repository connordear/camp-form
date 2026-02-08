"use client";

import { useRef } from "react";
import { toast } from "sonner";
import {
  CollapsibleFormCard,
  type CollapsibleFormCardRef,
} from "@/components/forms/collapsible-form-card";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useAppForm } from "@/hooks/use-camp-form";
import { useFormRegistry } from "@/hooks/use-form-registry";
import { getAge } from "@/lib/utils";
import { saveRegistrationDetails } from "./actions";
import {
  insertRegistrationDetailSchema,
  type RegistrationDetail,
} from "./schema";

type CampFieldContentProps = {
  registration: RegistrationDetail;
  age: number;
};

function CampFieldContent({ registration, age }: CampFieldContentProps) {
  const camper = registration.camper;
  const isMinor = age < 18;
  const form = useAppForm({
    defaultValues: {
      registrationId: registration.id,
      cabinRequest: registration.details?.cabinRequest ?? "",
      parentSignature: registration.details?.parentSignature ?? "",
      additionalInfo: registration.details?.additionalInfo ?? "",
    },
    validators: {
      onSubmit: insertRegistrationDetailSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      console.log(value);
      const toastId = toast.loading("Saving camp info...");
      try {
        const validatedValues =
          await insertRegistrationDetailSchema.parseAsync(value);
        await saveRegistrationDetails(validatedValues);
        toast.success(
          `Saved info for ${camper.firstName} - ${registration.campYear.camp.name}`,
          {
            id: toastId,
          },
        );
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

  const cardRef = useRef<CollapsibleFormCardRef>(null);

  useFormRegistry({
    formApi: form,
    cardRef,
    save: async () => {
      if (form.state.isDefaultValue) return true; // Nothing to save
      await form.handleSubmit();
      return form.state.isSubmitted && !form.state.errors.length;
    },
  });

  const title = `${camper.firstName} ${camper.lastName} - ${registration.campYear.camp.name}`;

  return (
    <form.AppForm>
      <form.Subscribe
        selector={(state) => ({
          isDefaultValue: state.isDefaultValue,
          isDirty: state.isDirty,
          values: state.values,
        })}
      >
        {({ isDefaultValue, isDirty, values }) => {
          const isComplete =
            isDefaultValue &&
            insertRegistrationDetailSchema.safeParse(values).success;

          return (
            <CollapsibleFormCard
              ref={cardRef}
              title={title}
              statusBadge={
                <form.StatusBadge schema={insertRegistrationDetailSchema} />
              }
              isComplete={isComplete}
              isDirty={isDirty}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="flex flex-col gap-3"
              >
                <CardContent>
                  <FieldSet className="w-full min-w-0">
                    <form.AppField name="cabinRequest">
                      {(field) => (
                        <Field>
                          <FieldLabel>Cabin Request</FieldLabel>
                          <field.WithErrors>
                            <field.TextArea placeholder="None (e.g. would like to be in a cabin with their friend/sibling/cousin...)" />
                          </field.WithErrors>
                        </Field>
                      )}
                    </form.AppField>

                    <form.AppField name="additionalInfo">
                      {(field) => (
                        <Field>
                          <FieldLabel>Additional Info</FieldLabel>
                          <field.WithErrors>
                            <field.TextArea
                              placeholder={`Anything else you would like us to know about ${camper.firstName}?`}
                            />
                          </field.WithErrors>
                        </Field>
                      )}
                    </form.AppField>

                    <form.AppField name="parentSignature">
                      {(field) => (
                        <Field>
                          <FieldLabel className="flex items-center">
                            {isMinor
                              ? "Parent/Guardian Signature"
                              : "Signature"}
                            <InfoTooltip>
                              <p className="font-semibold mb-2">
                                {isMinor ? "Parent Signature" : "Signature"}
                              </p>
                              {isMinor ? (
                                <p>
                                  I hereby release Mulhurst Lutheran Church Camp
                                  Association, its agents, members and employees
                                  not holding them for any liability for any
                                  accident, injury, or any claim arising out of
                                  above camper&apos;s use of Mulhurst Camp or
                                  any of its facilities, or virtue of
                                  participation in any of its programs. In case
                                  of emergency, I understand that every effort
                                  will be made to contact me. In the event that
                                  I cannot be reached, I hereby authorize the
                                  camp personnel to secure medical advice and
                                  services as may be deemed necessary for the
                                  safety of my child.
                                </p>
                              ) : (
                                <p>
                                  I hereby release Mulhurst Lutheran Church Camp
                                  Association, its agents, members and employees
                                  not holding them for any liability for any
                                  accident, injury, or any claim arising out of
                                  my use of Mulhurst Camp or any of its
                                  facilities, or virtue of participation in any
                                  of its programs. In case of emergency, I
                                  understand that every effort will be made to
                                  contact my emergency contact. In the event
                                  that they cannot be reached, I hereby
                                  authorize the camp personnel to secure medical
                                  advice and services as may be deemed necessary
                                  for my safety.
                                </p>
                              )}
                            </InfoTooltip>
                          </FieldLabel>
                          <field.WithErrors>
                            <field.TextInput />
                          </field.WithErrors>
                        </Field>
                      )}
                    </form.AppField>
                  </FieldSet>
                </CardContent>
                <CardFooter>
                  <form.SubmitButton
                    name="Save Camper"
                    onClick={() => form.handleSubmit()}
                  >
                    Submit
                  </form.SubmitButton>
                </CardFooter>
              </form>
            </CollapsibleFormCard>
          );
        }}
      </form.Subscribe>
    </form.AppForm>
  );
}

type CampFieldProps = {
  registration: RegistrationDetail;
};

export default function CampField({ registration }: CampFieldProps) {
  const age = getAge(registration.camper.dateOfBirth);
  return <CampFieldContent registration={registration} age={age} />;
}
