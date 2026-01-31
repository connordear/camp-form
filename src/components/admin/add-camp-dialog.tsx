"use client";

import { createId } from "@paralleldrive/cuid2";
import { PlusIcon, Trash2Icon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAppForm } from "@/hooks/use-camp-form";
import {
  createCampWithYearAndPricesSchema,
  type PriceEntry,
} from "@/lib/types/camp-schemas";

interface AddCampDialogProps {
  year: number;
}

const createEmptyPrice = (): PriceEntry => ({
  id: createId(), // Temporary ID for React key - server will generate real ID
  name: "",
  price: 0,
  isDayPrice: false,
});

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
      prices: [createEmptyPrice()] as PriceEntry[],
    },
    validators: {
      onSubmit: createCampWithYearAndPricesSchema,
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
  const formatPriceForDisplay = (cents: number): string => {
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                Create a new camp with {year} configuration and pricing.
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

                {/* Prices Section using field array */}
                <div className="border-t pt-4 mt-2">
                  <form.Field name="prices" mode="array">
                    {(pricesField) => (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium">Prices *</h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              pricesField.pushValue(createEmptyPrice())
                            }
                          >
                            <PlusIcon className="size-4 mr-1" />
                            Add Price
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          At least one price is required for registration.
                        </p>

                        <div className="space-y-4">
                          {pricesField.state.value.map((price, index) => (
                            <div
                              key={price.id ?? `new-${index}`}
                              className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30"
                            >
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <form.AppField name={`prices[${index}].name`}>
                                  {(field) => (
                                    <Field>
                                      <FieldLabel className="text-xs">
                                        Name *
                                      </FieldLabel>
                                      <field.WithErrors>
                                        <Input
                                          placeholder="e.g. Full Week"
                                          value={field.state.value}
                                          onChange={(e) =>
                                            field.handleChange(e.target.value)
                                          }
                                          onBlur={field.handleBlur}
                                        />
                                      </field.WithErrors>
                                    </Field>
                                  )}
                                </form.AppField>

                                <form.AppField name={`prices[${index}].price`}>
                                  {(field) => (
                                    <Field>
                                      <FieldLabel className="text-xs">
                                        Price ($) *
                                      </FieldLabel>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formatPriceForDisplay(
                                          field.state.value,
                                        )}
                                        onChange={(e) =>
                                          field.handleChange(
                                            parsePriceFromInput(e.target.value),
                                          )
                                        }
                                        onBlur={field.handleBlur}
                                      />
                                    </Field>
                                  )}
                                </form.AppField>

                                <form.AppField
                                  name={`prices[${index}].isDayPrice`}
                                >
                                  {(field) => (
                                    <Field>
                                      <FieldLabel className="text-xs">
                                        Day Price?
                                      </FieldLabel>
                                      <div className="flex items-center h-9">
                                        <Switch
                                          checked={field.state.value}
                                          onCheckedChange={(checked) =>
                                            field.handleChange(checked)
                                          }
                                        />
                                        <span className="ml-2 text-sm text-muted-foreground">
                                          {field.state.value ? "Yes" : "No"}
                                        </span>
                                      </div>
                                    </Field>
                                  )}
                                </form.AppField>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive shrink-0 mt-5"
                                onClick={() => pricesField.removeValue(index)}
                                disabled={pricesField.state.value.length <= 1}
                              >
                                <Trash2Icon className="size-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {pricesField.state.value.some((p) => !p.name) && (
                          <p className="text-sm text-destructive mt-2">
                            All prices must have a name.
                          </p>
                        )}
                      </>
                    )}
                  </form.Field>
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
              <form.SubmitButton>Create Camp</form.SubmitButton>
            </DialogFooter>
          </form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
