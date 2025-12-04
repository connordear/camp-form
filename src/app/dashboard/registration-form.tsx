'use client';
import { CampFormUser } from "@/lib/types/user-types"
import { getRegistrationsForUser } from "./actions"
import { useForm } from "@tanstack/react-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from "@/components/ui/select";
import { Field, FieldContent, FieldGroup, FieldLabel, FieldSeparator, FieldSet } from "@/components/ui/field";
import { DeleteIcon, XIcon } from "lucide-react";

type RegistrationFormProps = {
  user: CampFormUser
}

export default function RegistrationForm({ user }: RegistrationFormProps) {

  const form = useForm({
    defaultValues: {
      campers: user.campers
    },
    onSubmit: (v) => console.log(v)
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Camper Registration</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={e => {
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
                    <FieldSet key={camper.id} className="flex flex-col gap-3">
                      <Field>
                        <FieldLabel>
                          Camper Name
                        </FieldLabel>
                        <FieldContent>
                          <form.Field name={`campers[${i}].name`}>
                            {(camperNameField) => (
                              <Input value={camperNameField.state.value} onChange={e => camperNameField.handleChange(e.currentTarget.value)} />
                            )}
                          </form.Field>
                        </FieldContent>
                      </Field>
                      <Field className="pl-5">
                        <FieldLabel>
                          Registrations
                        </FieldLabel>
                        <FieldContent>
                          <form.Field key={i} name={`campers[${i}].registrations`} mode="array">
                            {(registrationsField) => (
                              <div className="flex flex-col gap-3">
                                {registrationsField.state.value.map((reg, j) => (
                                  <Field key={reg.id}>
                                    <FieldContent className="flex flex-row gap-1.5">
                                      <form.Field name={`campers[${i}].registrations[${j}].campId`}>
                                        {(campIdField) => (
                                          <Select value={(campIdField.state.value ?? 1).toString()} onValueChange={(v) => campIdField.setValue(parseInt(v))}>
                                            <SelectTrigger className="w-[300px]">
                                              <SelectValue placeholder="Camp" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="1">Children's Camp</SelectItem>
                                              <SelectItem value="2">Youth Camp</SelectItem>
                                              <SelectItem value="3">Family Camp</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        )}
                                      </form.Field>
                                      <Button variant="outline" size="icon" onClick={() => registrationsField.removeValue(j)}><XIcon /></Button>
                                    </FieldContent>
                                  </Field>
                                ))}
                                <Button className="w-fit" onClick={() => registrationsField.pushValue({ id: camper.id + Date.now(), campId: 1, camperId: camper.id, isPaid: false })}>Add Camp</Button>
                              </div>
                            )}
                          </form.Field>
                        </FieldContent>
                      </Field>
                      <FieldSeparator />
                    </FieldSet>
                  )
                })}
                <Button onClick={() => field.pushValue({ id: Date.now(), userId: user.id, name: '', registrations: [] })} type="button">
                  Add Camper
                </Button>
              </FieldGroup>
            )}
          </form.Field>
        </form>
      </CardContent >
    </Card >
  )
} 
