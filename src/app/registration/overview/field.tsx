import { createId } from "@paralleldrive/cuid2";
import { useMemo } from "react";
import RegistrationBadge from "@/components/forms/registration-badge";
import RemoveButton from "@/components/forms/remove-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { withFieldGroup } from "@/hooks/use-camp-form";
import type { Camp } from "@/lib/types/common-types";
import { getDaysBetweenDates } from "@/lib/utils";
import type { Camper } from "./schema";

// These default values are used for mapping keys, not runtime defaults
const defaultCamperValues: Camper = {
  id: createId(),
  userId: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "2000-01-01",
  registrations: [],
};

export const OverviewFieldGroup = withFieldGroup({
  defaultValues: defaultCamperValues,
  props: {
    camps: [] as Camp[],
    onRemove: () => {},
  },
  render: ({ group, camps, onRemove }) => {
    const camper = group.state.values;
    const hasOnlyDrafts = group.state.values?.registrations.every(
      (r) => r.status === "draft",
    );
    const campLookup = useMemo(
      () =>
        camps.reduce(
          (acc, curr) => {
            acc[curr.id] = curr;
            return acc;
          },
          {} as Record<string, Camp>,
        ),
      [camps],
    );

    const priceLookup = useMemo(
      () =>
        camps.reduce(
          (acc, curr) => {
            curr.prices.forEach((price) => {
              acc[price.id] = price;
            });
            return acc;
          },
          {} as Record<string, Camp["prices"][number]>,
        ),
      [camps],
    );

    const validCamps = camps.filter(
      (c) => !camper?.registrations.some((r) => r.campId === c.id),
    );

    return (
      <FieldSet className="flex flex-col gap-3 w-full min-w-0">
        <div className="flex flex-col md:flex-row gap-3">
          <group.AppField name="firstName">
            {(field) => (
              <Field>
                <FieldLabel>First Name</FieldLabel>
                <field.WithErrors>
                  <field.TextInput />
                </field.WithErrors>
              </Field>
            )}
          </group.AppField>
          <group.AppField name="lastName">
            {(field) => (
              <Field>
                <FieldLabel>Last Name</FieldLabel>
                <field.WithErrors>
                  <div className="flex gap-2">
                    <field.TextInput />

                    {hasOnlyDrafts && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <RemoveButton
                            className="self-end hidden md:flex"
                            tooltip="Delete Camper & Registrations"
                          />
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Camper?</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete this camper? You
                              will lose all information for{" "}
                              {camper?.firstName || "this camper"}, including
                              their registrations. This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <DialogClose asChild>
                              <Button variant="destructive" onClick={onRemove}>
                                Delete Camper
                              </Button>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </field.WithErrors>
              </Field>
            )}
          </group.AppField>
        </div>
        <group.AppField name="registrations" mode="array">
          {(field) => {
            return (
              <div className="flex flex-col gap-3 md:ml-5">
                <Field>
                  <FieldLabel>Registrations</FieldLabel>
                  {field.state.value?.map((reg, j) => {
                    const isDraft = reg.status === "draft";

                    const selectedCamp = campLookup[reg.campId];

                    const priceOptions =
                      selectedCamp?.prices.map((p) => ({
                        value: p.id,
                        name: `${p.name} ($${(p.price / 100).toFixed(2)}${p.isDayPrice ? "/day" : ""})`, // e.g. "Early Bird ($200)"
                      })) || [];

                    const selectedPrice = priceLookup[reg.priceId];
                    const isDayPrice = selectedPrice?.isDayPrice ?? false;

                    const maxDays = selectedCamp
                      ? getDaysBetweenDates(
                          selectedCamp.startDate,
                          selectedCamp.endDate,
                        ) - 1
                      : 0;

                    return (
                      <div
                        key={reg.id || j}
                        className="flex gap-2 items-start justify-between min-w-0 mb-2 p-2 border rounded-md"
                      >
                        <div className="flex gap-2 flex-1 flex-wrap min-w-0">
                          <group.AppField name={`registrations[${j}].campId`}>
                            {(itemField) => {
                              const campOptions = validCamps.map((c) => ({
                                value: c.id,
                                name: c.name,
                              }));
                              if (itemField.state.value) {
                                campOptions.push({
                                  value: itemField.state.value,
                                  name:
                                    campLookup[itemField.state.value]?.name ??
                                    "Unknown Camp",
                                });
                              }
                              return (
                                <div className="flex-1 min-w-[200px]">
                                  <itemField.Select
                                    className="w-full"
                                    placeholder="Select a camp"
                                    disabled={!isDraft}
                                    options={campOptions}
                                    onValueChange={(v) => {
                                      const defaultPrice =
                                        campLookup[v]?.prices[0];
                                      if (defaultPrice) {
                                        group.setFieldValue(
                                          `registrations[${j}].priceId`,
                                          defaultPrice?.id,
                                        );
                                        group.setFieldValue(
                                          `registrations[${j}].numDays`,
                                          defaultPrice.isDayPrice ? 1 : null,
                                        );
                                      }
                                    }}
                                  />
                                </div>
                              );
                            }}
                          </group.AppField>

                          {/* --- FIELD 2: PRICE SELECTION (Dependent on Camp) --- */}
                          <group.AppField
                            key={reg.campId}
                            name={`registrations[${j}].priceId`}
                          >
                            {(itemField) => (
                              <div className="flex-1 min-w-[200px]">
                                <itemField.Select
                                  className="w-full"
                                  placeholder={
                                    selectedCamp
                                      ? "Select Price"
                                      : "Pick Camp First"
                                  }
                                  onValueChange={(v) => {
                                    const newPrice = priceLookup[v];
                                    if (!newPrice.isDayPrice) {
                                      group.setFieldValue(
                                        `registrations[${j}].numDays`,
                                        null,
                                      );
                                    } else {
                                      group.setFieldValue(
                                        `registrations[${j}].numDays`,
                                        1,
                                      );
                                    }
                                  }}
                                  // Disable if no camp is selected yet
                                  disabled={!isDraft || !selectedCamp}
                                  options={priceOptions}
                                />
                              </div>
                            )}
                          </group.AppField>

                          {/* --- FIELD 3: NUM DAYS (Dependent on Price) --- */}
                          {isDayPrice && (
                            <group.AppField
                              name={`registrations[${j}].numDays`}
                              key={selectedPrice.id}
                            >
                              {(itemField) => (
                                <div className="w-[120px]">
                                  <itemField.Select
                                    placeholder="Days"
                                    className="w-full"
                                    disabled={!isDraft}
                                    isNumber
                                    options={Array.from({
                                      length: maxDays,
                                    }).map((_, i) => ({
                                      value: `${i + 1}`,
                                      name: `${i + 1} Day${i === 0 ? "" : "s"}`,
                                    }))}
                                  />
                                </div>
                              )}
                            </group.AppField>
                          )}
                        </div>

                        {/* --- ACTIONS --- */}
                        <div className="flex items-center gap-2 mt-1">
                          <RegistrationBadge status={reg.status ?? "draft"} />
                          {isDraft && (
                            <RemoveButton
                              tooltip="Remove registration"
                              onClick={() => field.removeValue(j)}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </Field>
                <Button
                  className="w-fit"
                  type="button"
                  disabled={!validCamps.length}
                  onClick={() => {
                    const defaultCamp = validCamps[0];
                    const defaultPrice = defaultCamp.prices[0];
                    field.pushValue({
                      id: createId(),
                      campId: defaultCamp.id,
                      camperId: group.state.values.id ?? null,
                      campYear: defaultCamp.year,
                      status: "draft",
                      priceId: defaultPrice.id,
                      numDays: defaultPrice.isDayPrice ? 1 : undefined,
                    });
                  }}
                >
                  Add Camp
                </Button>
              </div>
            );
          }}
        </group.AppField>
        <FieldSeparator />
      </FieldSet>
    );
  },
});
