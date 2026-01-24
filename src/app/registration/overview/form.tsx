"use client";
import { createId } from "@paralleldrive/cuid2";
import AutoSaveIndicator from "@/components/forms/save-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { useAppForm } from "@/hooks/use-camp-form";
import type { Camp } from "@/lib/types/common-types";
import { OverviewFieldGroup } from "./field";
import type { CampFormUser } from "./schema";
import { formSchema, saveCampersSchema } from "./schema";
import useOverviewAutoSave, {
  type CampFormApi,
} from "./use-auto-save-overview";

type RegistrationFormProps = {
  user: CampFormUser;
  camps: Camp[];
};

export default function OverviewForm({ user, camps }: RegistrationFormProps) {
  const form = useAppForm({
    defaultValues: {
      campers: saveCampersSchema.parse(user.campers),
    },
    validators: {
      onChange: formSchema,
    },
  });

  const { status, lastSaved } = useOverviewAutoSave(
    form as unknown as CampFormApi,
  );

  return (
    <>
      <Card className="flex-1 max-w-xl m-auto">
        <CardHeader>
          <CardTitle>Camper Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              //  form.handleSubmit();
            }}
          >
            <form.Field name="campers" mode="array">
              {(field) => (
                <FieldGroup className="flex flex-col gap-3">
                  {field.state.value.map((camper, i) => (
                    <OverviewFieldGroup
                      key={`${camper.id}-${i}`}
                      form={form}
                      camps={camps}
                      fields={`campers[${i}]`}
                      onRemove={() => field.removeValue(i)}
                    />
                  ))}
                  <Button
                    onClick={() =>
                      field.pushValue({
                        id: createId(),
                        userId: user.id,
                        firstName: "",
                        lastName: "",
                        dateOfBirth: "2000-01-01",
                        registrations: [],
                      })
                    }
                    type="button"
                  >
                    Add Camper
                  </Button>
                </FieldGroup>
              )}
            </form.Field>
          </form>
        </CardContent>
      </Card>

      <AutoSaveIndicator status={status} lastSaved={lastSaved} />
    </>
  );
}
