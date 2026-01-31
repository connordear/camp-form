"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createCampWithYear } from "@/app/admin/camps/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { useAppForm } from "@/hooks/use-camp-form";
import { createCampWithYearSchema } from "@/lib/types/camp-schemas";

interface AddCampDialogProps {
  year: number;
}

// TODO: Add ability to add multiple camp year prices (e.g. day price, adult price, etc.)
export function AddCampDialog({ year }: AddCampDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const form = useAppForm({
    defaultValues: {
      name: "",
      description: null as string | null,
      year: year,
      capacity: null as number | null,
      startDate: "",
      endDate: "",
    },
    validators: {
      onSubmit: createCampWithYearSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const toastId = toast.loading("Creating camp...");
      try {
        await createCampWithYear(value);
        toast.success("Camp created", { id: toastId });
        formApi.reset();
        setIsOpen(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create camp",
          { id: toastId },
        );
      }
    },
  });

  // Price formatting helpers
  const formatPriceForDisplay = (cents: number | null): string => {
    if (cents === null || cents === undefined) return "";
    return (cents / 100).toFixed(2);
  };

  const parsePriceFromInput = (value: string): number => {
    const num = parseFloat(value);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="size-4 mr-2" />
          Add Camp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form.AppForm>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>Add New Camp</DialogTitle>
              <DialogDescription>
                Create a new camp with {year} configuration.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <FieldSet className="gap-4">
                <form.AppField name="name">
                  {(field) => (
                    <Field>
                      <FieldLabel>Camp Name *</FieldLabel>
                      <field.WithErrors>
                        <field.TextInput placeholder="e.g. Junior Camp" />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>

                <form.AppField name="description">
                  {(field) => (
                    <Field>
                      <FieldLabel>Description</FieldLabel>
                      <field.TextArea
                        placeholder="Camp description (optional)"
                        rows={2}
                        value={field.state.value ?? ""}
                        onChange={(e) =>
                          field.handleChange(e.target.value || null)
                        }
                      />
                    </Field>
                  )}
                </form.AppField>

                <div className="border-t pt-4 mt-2">
                  <h4 className="text-sm font-medium mb-3">
                    {year} Configuration
                  </h4>

                  <form.AppField name="capacity">
                    {(field) => (
                      <Field className="mt-4">
                        <FieldLabel>Capacity</FieldLabel>
                        <field.WithErrors>
                          <field.TextInput
                            type="number"
                            min="0"
                            placeholder="Unlimited"
                            value={field.state.value ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.handleChange(
                                val === "" ? null : parseInt(val, 10),
                              );
                            }}
                          />
                        </field.WithErrors>
                      </Field>
                    )}
                  </form.AppField>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <form.AppField name="startDate">
                      {(field) => (
                        <Field>
                          <FieldLabel>Start Date *</FieldLabel>
                          <field.WithErrors>
                            <field.TextInput type="date" />
                          </field.WithErrors>
                        </Field>
                      )}
                    </form.AppField>

                    <form.AppField name="endDate">
                      {(field) => (
                        <Field>
                          <FieldLabel>End Date *</FieldLabel>
                          <field.WithErrors>
                            <field.TextInput type="date" />
                          </field.WithErrors>
                        </Field>
                      )}
                    </form.AppField>
                  </div>
                </div>
              </FieldSet>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <form.SubmitButton name="Create Camp">
                Create Camp
              </form.SubmitButton>
            </DialogFooter>
          </form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
