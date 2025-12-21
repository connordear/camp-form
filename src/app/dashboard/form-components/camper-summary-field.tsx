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
  id: -1,
  userId: 0,
  clientId: "",
  name: "",
  registrations: [],
};

export const CamperFieldGroup = withFieldGroup({
  defaultValues: defaultCamperValues,
  props: {
    index: 0, // Pass index to help with UI labeling
    onRemove: () => {},
    camps: [] as Camp[],
  },
  render: ({ group, index: i, camps, onRemove }) => {
    return (
      <FieldSet key={i} className="flex flex-col gap-3">
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
              <div>
                <Field>
                  <FieldLabel>Registrations</FieldLabel>
                  <FieldContent>
                    {field.state.value?.map((reg, j) => (
                      <group.AppField
                        key={j}
                        name={`registrations[${j}].campId`}
                      >
                        {(itemField) => (
                          <itemField.Select
                            key={reg.id}
                            label="Registrations"
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
                      id: -(group.state.values.id + Date.now()),
                      clientId: crypto.randomUUID(),
                      campId: 1,
                      camperId: group.state.values.id,
                      isPaid: false,
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
