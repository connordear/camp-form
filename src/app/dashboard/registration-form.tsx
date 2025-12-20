"use client";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { XIcon } from "lucide-react";
import type { CampFormUser } from "@/lib/types/user-types";
import { saveRegistrationsForUser } from "./actions";
import { Camp } from "@/lib/types/camp-types";
import { CamperFieldGroup } from "./form-components/camper-summary-field";
import { useAppForm } from "@/hooks/use-camp-form";

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

  return (
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
  );
}
