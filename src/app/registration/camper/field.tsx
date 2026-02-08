"use client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import AddButton from "@/components/forms/add-button";
import {
  CollapsibleFormCard,
  type CollapsibleFormCardRef,
} from "@/components/forms/collapsible-form-card";
import EditButton from "@/components/forms/edit-button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Switch } from "@/components/ui/switch";
import { useAppForm } from "@/hooks/use-camp-form";
import { useFormRegistry } from "@/hooks/use-form-registry";
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

  const cardRef = useRef<CollapsibleFormCardRef>(null);

  // Sync addressId from server when it changes (e.g., after creating a new address)
  useEffect(() => {
    const currentValue = form.getFieldValue("addressId");
    if (camper.addressId && camper.addressId !== currentValue) {
      form.setFieldValue("addressId", camper.addressId);
    }
  }, [camper.addressId, form]);

  useFormRegistry({
    formApi: form,
    cardRef,
    save: async () => {
      if (form.state.isDefaultValue) return true; // Nothing to save
      await form.handleSubmit();
      return form.state.isSubmitted && !form.state.errors.length;
    },
  });

  const title = `${camper.firstName} ${camper.lastName}`;

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
            isDefaultValue && camperInfoInsertSchema.safeParse(values).success;

          return (
            <CollapsibleFormCard
              ref={cardRef}
              title={title}
              statusBadge={<form.StatusBadge schema={camperInfoInsertSchema} />}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <form.AppField name="dateOfBirth">
                        {(field) => (
                          <Field>
                            <FieldLabel>Date of Birth</FieldLabel>
                            <field.WithErrors>
                              <field.DatePicker placeholder="Select birth date" />
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
                                      onAddressCreated: (addressId) => {
                                        form.setFieldValue(
                                          "addressId",
                                          addressId,
                                        );
                                      },
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
                        <div className="flex items-center justify-between gap-4">
                          <label
                            htmlFor={`camp-before-${camper.id}`}
                            className="font-medium text-sm"
                          >
                            Has {camper.firstName} been to camp before?
                          </label>
                          <div className="flex items-center gap-2 text-sm">
                            <Switch
                              id={`camp-before-${camper.id}`}
                              checked={field.state.value ?? false}
                              onCheckedChange={field.handleChange}
                            />
                            <span className="font-medium w-7">
                              {field.state.value ? "Yes" : "No"}
                            </span>
                          </div>
                        </div>
                      )}
                    </form.AppField>
                    <form.AppField name="arePhotosAllowed">
                      {(field) => (
                        <div className="flex items-center justify-between gap-4">
                          <label
                            htmlFor={`photos-${camper.id}`}
                            className="font-medium text-sm flex items-center"
                          >
                            Are photos of {camper.firstName} allowed?
                            <InfoTooltip>
                              <p className="mb-2">
                                At Mulhurst we like to take photos and videos
                                during camp for archives, powerpoint updates for
                                meetings, PR, marketing and promotional use.
                              </p>
                              <p className="mb-2">
                                Please let your child know prior to camp if they
                                are not allowed to be in pictures or videos, so
                                they are not disappointed when we do not allow
                                them to be in a photograph.
                              </p>
                              <p>
                                Mulhurst Lutheran Church Camp follows the
                                principles under the Provincial Information
                                Privacy Act (PIPA) as it relates to non-profit
                                organizations. The use of photographs and/or
                                videos of me or my child, if applicant is under
                                18 years of age, for the use of Mulhurst Camp
                                publications, documents, displays or website
                                use. By clicking box identified as "yes" I am in
                                agreeance and give consent to the use of my
                                child's photo and/or video to be used for the
                                purposes outlined above.
                              </p>
                            </InfoTooltip>
                          </label>
                          <div className="flex items-center gap-2 text-sm">
                            <Switch
                              id={`photos-${camper.id}`}
                              checked={field.state.value}
                              onCheckedChange={field.handleChange}
                            />
                            <span className="font-medium w-7">
                              {field.state.value ? "Yes" : "No"}
                            </span>
                          </div>
                        </div>
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
            </CollapsibleFormCard>
          );
        }}
      </form.Subscribe>
    </form.AppForm>
  );
}
