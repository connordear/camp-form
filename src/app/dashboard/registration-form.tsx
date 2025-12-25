"use client";
import Link from "next/link";
import AutoSaveIndicator from "@/components/forms/save-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useAppForm } from "@/hooks/use-camp-form";
import type { Camp } from "@/lib/types/camp-types";
import type { CampFormUser } from "@/lib/types/user-types";
import { formSchema, saveCampersSchema } from "@/lib/zod-schema";
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
      campers: saveCampersSchema.parse(user.campers),
    },
    validators: {
      onChange: formSchema,
    },
  });
  const { status, lastSaved } = useAutoSave(form);

  return (
    <div>
      <Card className="mb-4">
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
                      key={`${camper.clientId}-${i}`}
                      form={form}
                      camps={camps}
                      onRemove={() => field.removeValue(i)}
                      fields={`campers[${i}]`}
                    />
                  ))}
                  <Button
                    onClick={() =>
                      field.pushValue({
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
                </FieldGroup>
              )}
            </form.Field>
          </form>
        </CardContent>
      </Card>

      <Link href="/checkout">Checkout</Link>
      <AutoSaveIndicator status={status} lastSaved={lastSaved} />
    </div>
  );
}
