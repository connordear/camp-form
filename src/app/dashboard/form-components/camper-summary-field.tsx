import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { withFieldGroup } from "@/hooks/use-camp-form";
import type { Camp } from "@/lib/types/camp-types";
import type { Camper } from "@/lib/types/camper-types";

// These default values are used for mapping keys, not runtime defaults
const defaultCamperValues: Camper = {
  userId: 0,
  clientId: "",
  name: "",
  registrations: [],
};

export const CamperFieldGroup = withFieldGroup({
  defaultValues: defaultCamperValues,
  props: {
    onRemove: () => {},
    camps: [] as Camp[],
  },
  render: ({ group, camps, onRemove }) => {
    return (
      <FieldSet className="flex flex-col gap-3">
        <group.AppField name="name">
          {(field) => (
            <Field>
              <FieldLabel>Camper Name</FieldLabel>
              <FieldContent>
                <field.TextInput onRemove={onRemove} />
              </FieldContent>
            </Field>
          )}
        </group.AppField>
        <group.AppField name="registrations" mode="array">
          {(field) => {
            return (
              <div className="flex flex-col gap-1 ml-5">
                <Field>
                  <FieldLabel>Registrations</FieldLabel>
                  <FieldContent>
                    {field.state.value?.map((reg, j) => (
                      <group.AppField
                        key={`${reg.clientId}-${j}`}
                        name={`registrations[${j}].campId`}
                      >
                        {(itemField) => (
                          <itemField.Select
                            options={camps.map((c) => ({
                              value: c.id.toString(),
                              name: c.name,
                            }))}
                            onRemove={() => field.removeValue(j)}
                          />
                        )}
                      </group.AppField>
                    ))}
                  </FieldContent>
                </Field>
                <Button
                  className="w-fit"
                  type="button"
                  onClick={() =>
                    field.pushValue({
                      clientId: crypto.randomUUID(),
                      campId: 1,
                      camperId: group.state.values.id ?? null,
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
