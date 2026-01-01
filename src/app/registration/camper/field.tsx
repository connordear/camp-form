"use client";
import AddButton from "@/components/forms/add-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { useAppForm } from "@/hooks/use-camp-form";
import { saveCamper } from "./actions";
import {
  type Address,
  type AddressFormValues,
  type CamperInfo,
  camperInfoInsertSchema,
} from "./schema";

type CamperFieldProps = {
  camper: CamperInfo;
  addresses: Address[];
  openAddressForm: (
    camperId: CamperInfo["id"],
    address?: AddressFormValues,
  ) => void;
};

export default function CamperField({
  camper,
  addresses,
  openAddressForm,
}: CamperFieldProps) {
  const { firstName, lastName, createdAt, updatedAt, ...camperValues } = camper;

  const form = useAppForm({
    defaultValues: {
      ...camperValues,
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
          className="flex flex-col gap-3 items-start"
        >
          <FieldSet>
            <form.AppField name="dateOfBirth">
              {(field) => (
                <>
                  <Field>
                    <FieldLabel>Date of Birth</FieldLabel>
                    <field.WithErrors>
                      <field.TextInput />
                    </field.WithErrors>
                  </Field>
                </>
              )}
            </form.AppField>

            <form.AppField name="addressId">
              {(field) => (
                <>
                  <Field>
                    <FieldLabel>Address</FieldLabel>
                    <field.WithErrors>
                      <div className="flex gap-1">
                        <field.Select
                          placeholder={
                            addresses.length
                              ? "Select an address"
                              : "Create an address first ->"
                          }
                          disabled={!addresses.length}
                          options={addresses.map((a) => ({
                            name: `${a.postalZip}`,
                            value: a.id,
                          }))}
                        />
                        <AddButton
                          onClick={() => openAddressForm(camper.id)}
                          tooltip="Add new address"
                        />
                      </div>
                    </field.WithErrors>
                  </Field>
                </>
              )}
            </form.AppField>
          </FieldSet>
          <Button name="Create an address" onClick={() => form.handleSubmit()}>
            Submit
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
