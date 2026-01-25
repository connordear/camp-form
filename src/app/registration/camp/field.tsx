"use client";

import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { useAppForm } from "@/hooks/use-camp-form";
import { getAge } from "@/lib/utils";
import { saveRegistrationDetails } from "./actions";
import {
  insertRegistrationDetailSchema,
  type RegistrationDetail,
} from "./schema";

type CampFieldProps = {
  registration: RegistrationDetail;
};

export default function CampField({ registration }: CampFieldProps) {
  const camper = registration.camper;
  const age = getAge(camper.dateOfBirth);
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

  return (
    <form.AppForm>
      <Card className="w-full max-w-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="flex flex-col gap-3"
        >
          <CardHeader>
            <div className="flex gap-3 justify-between items-center">
              <CardTitle className="truncate">{`${camper.firstName} ${camper.lastName} - ${registration.campYear.camp.name}`}</CardTitle>

              <form.StatusBadge />
            </div>
          </CardHeader>
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
                      <field.TextArea />
                    </field.WithErrors>
                  </Field>
                )}
              </form.AppField>

              {age < 18 && (
                <form.AppField name="parentSignature">
                  {(field) => (
                    <Field>
                      <FieldLabel>Parent/Guardian Signature</FieldLabel>
                      <field.WithErrors>
                        <field.TextInput />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>
              )}
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
      </Card>
    </form.AppForm>
  );
}
