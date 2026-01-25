"use client";
import { toast } from "sonner";
import AddButton from "@/components/forms/add-button";
import EditButton from "@/components/forms/edit-button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const shirtSizeOptions = [
  { value: "ys", name: "Youth Small" },
  { value: "ym", name: "Youth Medium" },
  { value: "yl", name: "Youth Large" },
  { value: "xs", name: "Adult XS" },
  { value: "s", name: "Adult Small" },
  { value: "m", name: "Adult Medium" },
  { value: "l", name: "Adult Large" },
  { value: "xl", name: "Adult XL" },
  { value: "xxl", name: "Adult XXL" },
];

const swimmingLevelOptions = [
  { value: "none", name: "Non-swimmer (must wear life jacket)" },
  { value: "beginner", name: "Beginner (comfortable in shallow water)" },
  { value: "intermediate", name: "Intermediate (can swim short distances)" },
  { value: "advanced", name: "Advanced (comfortable in deep water)" },
  { value: "prefer_not_to_say", name: "Adult - prefer not to answer" },
];

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
    onSubmit: async ({ value, formApi }) => {
      const toastId = toast.loading("Saving camper info...");
      try {
        const validatedValues = await camperInfoInsertSchema.parseAsync(value);
        await saveCamper(validatedValues);

        toast.success(`Saved info for ${firstName}`, {
          id: toastId,
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
              <CardTitle className="truncate">{`${camper.firstName} ${camper.lastName}`}</CardTitle>
              <form.StatusBadge />
            </div>
          </CardHeader>
          <CardContent>
            <FieldSet className="w-full min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.AppField name="dateOfBirth">
                  {(field) => (
                    <Field>
                      <FieldLabel>Date of Birth</FieldLabel>
                      <field.WithErrors>
                        <field.TextInput />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>

                <form.AppField name="gender">
                  {(field) => (
                    <Field>
                      <FieldLabel>Gender</FieldLabel>
                      <field.WithErrors>
                        <field.TextInput />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.AppField name="shirtSize">
                  {(field) => (
                    <Field>
                      <FieldLabel>Shirt Size</FieldLabel>
                      <field.WithErrors>
                        <field.Select
                          placeholder="Select a shirt size"
                          options={shirtSizeOptions}
                        />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>
                <form.AppField name="swimmingLevel">
                  {(field) => (
                    <Field>
                      <FieldLabel>Swimming Level</FieldLabel>
                      <field.WithErrors>
                        <field.Select
                          className="min-w-0 max-w-full flex-1"
                          placeholder="Select swimming level"
                          options={swimmingLevelOptions}
                        />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>
              </div>
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
                            className="w-max"
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

              <form.AppField name="hasBeenToCamp">
                {(field) => (
                  <Field orientation="horizontal" className="w-fit">
                    <field.Switch />
                    <FieldLabel>
                      {field.state.value
                        ? "Has been to camp before"
                        : "Has not been to camp before"}
                    </FieldLabel>
                  </Field>
                )}
              </form.AppField>
              <form.AppField name="arePhotosAllowed">
                {(field) => (
                  <Field orientation="horizontal" className="w-fit">
                    <field.Switch />
                    <FieldLabel>
                      {field.state.value
                        ? "Photos are allowed"
                        : "Photos are not allowed"}
                    </FieldLabel>
                  </Field>
                )}
              </form.AppField>
              <form.AppField name="dietaryRestrictions">
                {(field) => (
                  <Field className="w-full">
                    <FieldLabel>Dietary Restrictions</FieldLabel>
                    <field.TextArea placeholder="None" />
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
      </Card>
    </form.AppForm>
  );
}
