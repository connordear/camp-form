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

type RegistrationFormProps = {
  user: CampFormUser;
  camps: Camp[];
};

export default function RegistrationForm({
  user,
  camps,
}: RegistrationFormProps) {
  const form = useForm({
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
                {field.state.value.map((camper, i) => {
                  return (
                    <FieldSet key={i} className="flex flex-col gap-3">
                      <Field>
                        <div className="flex justify-between">
                          <FieldLabel>Camper Name</FieldLabel>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              field.removeValue(i);
                            }}
                          >
                            <XIcon />
                          </Button>
                        </div>
                        <FieldContent>
                          <form.Field name={`campers[${i}].name`}>
                            {(camperNameField) => (
                              <Input
                                value={camperNameField.state.value}
                                onChange={(e) =>
                                  camperNameField.handleChange(
                                    e.currentTarget.value,
                                  )
                                }
                              />
                            )}
                          </form.Field>
                        </FieldContent>
                      </Field>
                      <Field className="pl-5">
                        <FieldLabel>Registrations</FieldLabel>
                        <FieldContent>
                          <form.Field
                            name={`campers[${i}].registrations`}
                            mode="array"
                          >
                            {(registrationsField) => (
                              <div className="flex flex-col gap-3">
                                {registrationsField.state.value.map(
                                  (reg, j) => (
                                    <Field key={reg.id}>
                                      <FieldContent className="flex flex-row gap-1.5">
                                        <form.Field
                                          name={`campers[${i}].registrations[${j}].campId`}
                                        >
                                          {(campIdField) => (
                                            <Select
                                              value={(
                                                campIdField.state.value ?? 1
                                              ).toString()}
                                              onValueChange={(v) =>
                                                campIdField.setValue(
                                                  parseInt(v, 10),
                                                )
                                              }
                                            >
                                              <SelectTrigger className="w-[300px]">
                                                <SelectValue placeholder="Camp" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {camps.map((c) => (
                                                  <SelectItem
                                                    key={c.id}
                                                    value={c.id.toString()}
                                                  >
                                                    {c.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )}
                                        </form.Field>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            registrationsField.removeValue(j);
                                          }}
                                        >
                                          <XIcon />
                                        </Button>
                                      </FieldContent>
                                    </Field>
                                  ),
                                )}
                                <Button
                                  className="w-fit"
                                  type="button"
                                  onClick={() =>
                                    registrationsField.pushValue({
                                      id: -(camper.id + Date.now()),
                                      campId: 1,
                                      camperId: camper.id,
                                      isPaid: false,
                                    })
                                  }
                                >
                                  Add Camp
                                </Button>
                              </div>
                            )}
                          </form.Field>
                        </FieldContent>
                      </Field>
                      <FieldSeparator />
                    </FieldSet>
                  );
                })}
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
