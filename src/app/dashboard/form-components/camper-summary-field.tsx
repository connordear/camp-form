// src/features/registration/camper-group.tsx
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { withFieldGroup } from "@/hooks/use-camp-form";
import { Camp } from "@/lib/types/camp-types";
import { Camper } from "@/lib/types/camper-types";
import { XIcon } from "lucide-react";
import { z } from "zod";

// These default values are used for mapping keys, not runtime defaults
const defaultCamperValues: Camper = {
  id: 0,
  userId: 0,
  name: "",
  registrations: [],
};

export const CamperFieldGroup = withFieldGroup({
  defaultValues: defaultCamperValues,
  props: {
    index: 0, // Pass index to help with UI labeling
    onRemove: () => { },
    camps: [] as Camp[],
  },
  render: ({ group, index: i, camps, onRemove }) => {
    return (
      <FieldSet key={i} className="flex flex-col gap-3">
        <group.AppField name="name">
          {(field) => (
            <div>
              <field.TextInput label="Camper Name" />

              <Button variant="outline" size="icon" onClick={onRemove}>
                <XIcon />
              </Button>
            </div>
          )}
        </group.AppField>
        <group.AppField name="registrations" mode="array">
          {(field) => {
            return (
              <div>
                {field.state.value?.map((reg, j) => (
                  <group.AppField key={j} name={`registrations[${j}].campId`}>
                    {(itemField) => (
                      <div key={reg.id}>
                        <itemField.Select
                          label="Registrations"
                          options={camps.map((c) => ({
                            value: c.id.toString(),
                            name: c.name,
                          }))}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            field.removeValue(j);
                          }}
                        >
                          <XIcon />
                        </Button>
                      </div>
                    )}
                  </group.AppField>
                ))}
                <Button
                  className="w-fit"
                  type="button"
                  onClick={() =>
                    field.pushValue({
                      id: -(group.state.values.id + Date.now()),
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
