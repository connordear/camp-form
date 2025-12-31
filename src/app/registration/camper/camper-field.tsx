"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { useAppForm } from "@/hooks/use-camp-form";
import { saveCamper } from "./actions";
import {
  type Address,
  type CamperInfo,
  camperInfoInsertSchema,
} from "./schema";

type CamperFieldProps = {
  camper: CamperInfo;
  addresses: Address[];
};

export default function CamperField({ camper, addresses }: CamperFieldProps) {
  const { firstName, lastName, clientId, address, ...camperValues } = camper;

  const form = useAppForm({
    defaultValues: {
      ...camperValues,
      addressId: addresses.length ? addresses[0].id : 0,
    },
    validators: {
      onChange: camperInfoInsertSchema,
    },
    onSubmit: async ({ value }) => {
      const validatedValues = await camperInfoInsertSchema.parseAsync(value);
      await saveCamper(validatedValues);
    },
  });

  return (
    <Card>
      <CardHeader>
        {camper.firstName} {camper.lastName}
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="flex flex-col gap-3"
        >
          <FieldSet>
            <form.AppField name="dateOfBirth">
              {(field) => (
                <Field>
                  <FieldLabel>Date of Birth</FieldLabel>
                  <FieldContent>
                    <field.TextInput />
                  </FieldContent>
                </Field>
              )}
            </form.AppField>
          </FieldSet>

          <FieldSet>
            <form.AppField name="addressId">
              {(field) => (
                <Field>
                  <FieldLabel>Address</FieldLabel>
                  <FieldContent>
                    <field.Select
                      isNumber
                      disabled={!addresses}
                      options={addresses.map((a) => ({
                        name: `${a.postalZip}`,
                        value: a.id.toString(),
                      }))}
                    />
                  </FieldContent>
                </Field>
              )}
            </form.AppField>
          </FieldSet>
          <Button onClick={() => form.handleSubmit()}>Submit</Button>
        </form>
      </CardContent>
    </Card>
  );
}
