import { createId } from "@paralleldrive/cuid2";
import RegistrationBadge from "@/components/forms/registration-badge";
import RemoveButton from "@/components/forms/remove-button";
import { Button } from "@/components/ui/button";
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
    const campLookup = camps.reduce(
      (acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      },
      {} as Record<string, Camp>,
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
                  <field.TextInput />
                </field.WithErrors>
              </Field>
            )}
          </group.AppField>
          {hasOnlyDrafts && (
            <RemoveButton
              className="self-end hidden md:flex"
              tooltip="Delete Camper & Registrations"
              onClick={onRemove}
            />
          )}
        </div>
        <group.AppField name="registrations" mode="array">
          {(field) => {
            return (
              <div className="flex flex-col gap-3 md:ml-5">
                <Field>
                  <FieldLabel>Registrations</FieldLabel>
                  {field.state.value?.map((reg, j) => {
                    const isDraft = reg.status === "draft";
                    return (
                      <group.AppField
                        key={reg.id}
                        name={`registrations[${j}].campId`}
                      >
                        {(itemField) => {
                          const campOptions = validCamps.map((c) => ({
                            value: c.id,
                            name: c.name,
                          }));
                          let hasDayPrice = false;
                          let numDays = 0;
                          if (itemField.state.value) {
                            const camp = campLookup[itemField.state.value];
                            campOptions.push({
                              value: itemField.state.value,
                              name: camp?.name ?? "Unknown Camp Selected",
                            });
                            hasDayPrice = !!camp.dayPrice;

                            numDays =
                              getDaysBetweenDates(
                                camp.startDate,
                                camp.endDate,
                              ) - 1;
                          }
                          return (
                            <div className="flex gap-1 items-center justify-between min-w-0">
                              <div className="flex gap-1 flex-1 min-w-0">
                                <itemField.Select
                                  className="min-w-0 flex-1"
                                  placeholder="Select a camp"
                                  disabled={!isDraft}
                                  options={campOptions}
                                />
                              </div>
                              <group.AppField
                                name={`registrations[${j}].numDays`}
                              >
                                {(itemField) => {
                                  return (
                                    <itemField.Select
                                      placeholder="Full Week"
                                      className="w-[110px]"
                                      disabled={!hasDayPrice}
                                      isNumber
                                      options={Array.from({
                                        length: numDays,
                                      }).map((_, i) => ({
                                        value: `${i + 1}`,
                                        name: `${i + 1} Days`,
                                      }))}
                                    ></itemField.Select>
                                  );
                                }}
                              </group.AppField>
                              <RegistrationBadge
                                status={reg.status ?? "draft"}
                              />
                              {isDraft && (
                                <RemoveButton
                                  className="self-start"
                                  tooltip="Remove registration"
                                  onClick={() => field.removeValue(j)}
                                />
                              )}
                            </div>
                          );
                        }}
                      </group.AppField>
                    );
                  })}
                </Field>
                <Button
                  className="w-fit"
                  type="button"
                  disabled={!validCamps.length}
                  onClick={() =>
                    field.pushValue({
                      id: createId(),
                      campId: validCamps[0].id,
                      camperId: group.state.values.id ?? null,
                      campYear: validCamps[0].year,
                      status: "draft",
                    })
                  }
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
