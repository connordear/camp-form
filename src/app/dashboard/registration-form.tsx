"use client";
import AutoSaveIndicator from "@/components/forms/save-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useAppForm } from "@/hooks/use-camp-form";
import type { Camp } from "@/lib/types/camp-types";
import type { CampFormUser } from "@/lib/types/user-types";
import { saveRegistrationsForUser } from "./actions";
import { CamperFieldGroup } from "./form-components/camper-summary-field";

type RegistrationFormProps = {
  user: CampFormUser;
  camps: Camp[];
};

export default function RegistrationForm({
  user,
  camps,
}: RegistrationFormProps) {
  const form = useAppForm({
    defaultValues: {
      campers: user.campers,
    },
    onSubmit: async ({ value }) => {
      try {
        const updatedUser = await saveRegistrationsForUser(
          user.id,
          value.campers,
        );
        console.log("updating with, ", updatedUser.campers);
        form.reset({ ...form.state.values, campers: updatedUser.campers });
      } catch (error) {
        console.error("Failed to save registrations:", error);
      }
    },
  });
  const { status, lastSaved } = useAutoSave(user.id, form);

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Camper Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field name="campers" mode="array">
              {(field) => (
                <FieldGroup className="flex flex-col gap-3">
                  {field.state.value.map((camper, i) => (
                    <CamperFieldGroup
                      form={form}
                      key={camper.id}
                      camps={camps}
                      onRemove={() => field.removeValue(i)}
                      index={i}
                      fields={`campers[${i}]`}
                    />
                  ))}
                  <Button
                    onClick={() =>
                      field.pushValue({
                        id: -Date.now(),
                        clientId: crypto.randomUUID(),
                        userId: user.id,
                        name: "",
                        registrations: [],
                      })
                    }
                    type="button"
                  >
                    Add Camper
                  </Button>
                  <Button type="submit">Save Registrations</Button>
                </FieldGroup>
              )}
            </form.Field>
          </form>
        </CardContent>
      </Card>
      <AutoSaveIndicator status={status} lastSaved={lastSaved} />
    </div>
  );
}
