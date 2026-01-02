"use client";
import AddButton from "@/components/forms/add-button";
import EditButton from "@/components/forms/edit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { useAppForm } from "@/hooks/use-camp-form";
import { saveCamper } from "./actions";
import type { OpenAddressFormArgs } from "./form";
import {
  type Address,
  type CamperInfo,
  camperInfoInsertSchema,
} from "./schema";

type CamperFieldProps = {
  camper: CamperInfo;
  addresses: Address[];
  openAddressForm: (args: OpenAddressFormArgs) => void;
};

export default function CamperField({
  camper,
  addresses,
  openAddressForm,
}: CamperFieldProps) {
  const addressOptions = addresses.map((a) => ({
    name: `${a.postalZip}`,
    value: a.id,
  }));

  const { firstName, lastName, createdAt, updatedAt, ...camperValues } = camper;

  const form = useAppForm({
    defaultValues: {
      ...camperValues,
    },
    validators: {
      onSubmit: camperInfoInsertSchema,
    },
    onSubmit: async ({ value }) => {
      const validatedValues = await camperInfoInsertSchema.parseAsync(value);
      await saveCamper(validatedValues);
    },
  });

  return (
    <form.AppForm>
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="flex flex-col gap-3 items-start"
        >
          <CardHeader>
            <div className="flex gap-3 justify-between items-center">
              <CardTitle className="truncate">{`${camper.firstName} ${camper.lastName}`}</CardTitle>
              <form.AutoSaver onSave={saveCamper} />
            </div>
          </CardHeader>
          <CardContent>
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
                {(field) => {
                  const currentAddress = addresses.find(
                    (a) => a.id === field.state.value,
                  );
                  return (
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
                            options={addressOptions}
                          />
                          <EditButton
                            disabled={!currentAddress}
                            tooltip={`Edit Address ${currentAddress?.postalZip}`}
                            onClick={() =>
                              openAddressForm({
                                camperId: camper.id,
                                address: currentAddress,
                              })
                            }
                          />
                          <AddButton
                            onClick={() =>
                              openAddressForm({
                                camperId: camper.id,
                              })
                            }
                            tooltip="Add new address"
                          />
                        </div>
                      </field.WithErrors>
                    </Field>
                  );
                }}
              </form.AppField>
            </FieldSet>
            <form.SubmitButton
              name="Save Camper"
              onClick={() => form.handleSubmit()}
            >
              Submit
            </form.SubmitButton>
          </CardContent>
        </form>
      </Card>
    </form.AppForm>
  );
}
