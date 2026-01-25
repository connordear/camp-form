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
import type { FormStatus } from "@/lib/types/common-types";
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
      cabinRequest: registration.details?.cabinRequest ?? null,
      parentSignature: registration.details?.parentSignature ?? null,
      additionalInfo: registration.details?.additionalInfo ?? null,
    },
    validators: {
      onSubmit: insertRegistrationDetailSchema,
    },
    onSubmit: async ({ value }) => {
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

  // for now just check if we pulled an id out, if so, we know it saved
  const [status, setStatus] = useState<FormStatus>(
    camper.addressId ? "complete" : "draft",
  );

  useEffect(() => {
    hasSubmitted && setStatus("complete");
  }, [hasSubmitted]);

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

              <FormStatusBadge status={status} />
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
