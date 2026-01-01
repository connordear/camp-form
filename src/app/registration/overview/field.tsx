import { createId } from "@paralleldrive/cuid2";
import RegistrationBadge from "@/components/forms/registration-badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { withFieldGroup } from "@/hooks/use-camp-form";
import type { Camp } from "@/lib/types/common-types";
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
    onRemove: () => {},
    camps: [] as Camp[],
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
      <FieldSet className="flex flex-col gap-3">
        <div className="flex gap-3">
          <group.AppField name="firstName">
            {(field) => (
              <Field>
                <FieldLabel>First Name</FieldLabel>
                <FieldContent>
                  <field.TextInput />
                </FieldContent>
              </Field>
            )}
          </group.AppField>
          <group.AppField name="lastName">
            {(field) => (
              <Field>
                <FieldLabel>Last Name</FieldLabel>
                <FieldContent>
                  <field.TextInput
                    onRemove={hasOnlyDrafts ? onRemove : undefined}
                  />
                </FieldContent>
              </Field>
            )}
          </group.AppField>
        </div>
        <group.AppField name="registrations" mode="array">
          {(field) => {
            return (
              <div className="flex flex-col gap-1 ml-5">
                <Field>
                  <FieldLabel>Registrations</FieldLabel>
                  <FieldContent>
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
                            if (itemField.state.value) {
                              campOptions.push({
                                value: itemField.state.value,
                                name:
                                  campLookup[itemField.state.value]?.name ??
                                  "Unknown Camp Selected",
                              });
                            }
                            return (
                              <div className="flex gap-1 items-center justify-between">
                                <itemField.Select
                                  placeholder="Select a camp"
                                  disabled={!isDraft}
                                  options={campOptions}
                                  onRemove={
                                    isDraft
                                      ? () => field.removeValue(j)
                                      : undefined
                                  }
                                />
                                <RegistrationBadge
                                  status={reg.status ?? "draft"}
                                />
                              </div>
                            );
                          }}
                        </group.AppField>
                      );
                    })}
                  </FieldContent>
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
