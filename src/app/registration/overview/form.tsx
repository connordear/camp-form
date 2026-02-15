"use client";
import { createId } from "@paralleldrive/cuid2";
import { useRef } from "react";
import type { CollapsibleFormCardRef } from "@/components/forms/collapsible-form-card";
import AutoSaveIndicator from "@/components/forms/save-indicator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { useAppForm } from "@/hooks/use-camp-form";
import { useManualFormRegistry } from "@/hooks/use-form-registry";
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

  const { status, lastSaved, forceSave } = useOverviewAutoSave(
    form as unknown as CampFormApi,
  );

  // Overview page doesn't have a collapsible card, so we use a null ref
  const cardRef = useRef<CollapsibleFormCardRef>(null);

  useManualFormRegistry({
    cardRef,
    isDirty: () => !(status === "saved" || status === "idle"),
    validate: async () => form.state.isValid,
    save: async () => {
      // If already saved or idle (nothing to save), return success
      if (status === "saved" || status === "idle") return true;
      // Force save and return result
      return await forceSave();
    },
  });

  return (
    <>
      <Card className="flex-1 max-w-xl m-auto">
        <CardHeader>
          <CardTitle>Camper Registration</CardTitle>
          <CardDescription className="flex flex-col gap-3 mt-1">
            <p>Welcome to Mulhurst Camp registration!</p>
            <p>
              Our registration forms have been updated this year to allow for
              multiple registrations to be worked on at the same time.
              Additionally, information such as addresses and emergency contacts
              can be used across campers & registrations made on your account.
            </p>
            <p>
              Start off by adding one or more campers below, and then once
              you're done each page, click the save & continue button to proceed
              to the next page.
            </p>
          </CardDescription>
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

      <div className="hidden md:block">
        <AutoSaveIndicator status={status} lastSaved={lastSaved} />
      </div>
    </>
  );
}
