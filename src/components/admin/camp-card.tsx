"use client";

import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  createCampYear,
  deleteCamp,
  deleteCampYear,
  updateCamp,
  updateCampYear,
} from "@/app/admin/camps/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { useAppForm } from "@/hooks/use-camp-form";
import type { CampWithYear } from "@/lib/services/camp-service";
import {
  campUpdateSchema,
  campYearInsertSchema,
  campYearUpdateSchema,
} from "@/lib/types/camp-schemas";

interface CampCardProps {
  camp: CampWithYear;
  year: number;
}

export function CampCard({ camp, year }: CampCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const hasCampYear = camp.campYear !== null;

  // Camp details form (name, description)
  const campForm = useAppForm({
    defaultValues: {
      id: camp.id,
      name: camp.name,
      description: camp.description ?? null,
    },
    validators: {
      onSubmit: campUpdateSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const toastId = toast.loading("Saving camp...");
      try {
        await updateCamp(value);
        toast.success("Camp saved", { id: toastId });
        formApi.reset(value);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save camp",
          { id: toastId },
        );
      }
    },
  });

  // Camp year form (pricing, dates, capacity)
  const campYearForm = useAppForm({
    defaultValues: {
      campId: camp.id,
      year: year,
      basePrice: camp.campYear?.basePrice ?? 0,
      dayPrice: camp.campYear?.dayPrice ?? null,
      capacity: camp.campYear?.capacity ?? null,
      startDate: camp.campYear?.startDate ?? "",
      endDate: camp.campYear?.endDate ?? "",
    },
    validators: {
      onSubmit: hasCampYear ? campYearUpdateSchema : campYearInsertSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const toastId = toast.loading(
        hasCampYear ? "Saving camp year..." : "Adding camp year...",
      );
      try {
        if (hasCampYear) {
          await updateCampYear(value);
        } else {
          await createCampYear(value);
        }
        toast.success(hasCampYear ? "Camp year saved" : "Camp year added", {
          id: toastId,
        });
        formApi.reset(value);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save camp year",
          { id: toastId },
        );
      }
    },
  });

  const handleDeleteCamp = async () => {
    setIsDeleting(true);
    const toastId = toast.loading("Deleting camp...");
    try {
      await deleteCamp(camp.id);
      toast.success("Camp deleted", { id: toastId });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete camp",
        { id: toastId },
      );
      setIsDeleting(false);
    }
  };

  const handleDeleteCampYear = async () => {
    const toastId = toast.loading(`Deleting ${year} data...`);
    try {
      await deleteCampYear(camp.id, year);
      toast.success(`${year} data deleted`, { id: toastId });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete camp year",
        { id: toastId },
      );
    }
  };

  // Price formatting helpers
  const formatPriceForDisplay = (cents: number | null): string => {
    if (cents === null || cents === undefined) return "";
    return (cents / 100).toFixed(2);
  };

  const parsePriceFromInput = (value: string): number => {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return 0;
    return Math.round(num * 100);
  };

  return (
    <Card className="w-full">
      <campForm.AppForm>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <CardHeader>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <campForm.AppField name="name">
                  {(field) => (
                    <Field>
                      <FieldLabel className="sr-only">Camp Name</FieldLabel>
                      <field.WithErrors>
                        <field.TextInput
                          className="text-xl font-semibold bg-transparent border-transparent hover:border-input focus:border-input transition-colors"
                          placeholder="Camp name"
                        />
                      </field.WithErrors>
                    </Field>
                  )}
                </campForm.AppField>
              </div>
            </div>
            <campForm.AppField name="description">
              {(field) => (
                <Field>
                  <FieldLabel className="sr-only">Description</FieldLabel>
                  <field.TextArea
                    className="resize-none bg-transparent border-transparent hover:border-input focus:border-input transition-colors text-muted-foreground"
                    placeholder="Camp description (optional)"
                    rows={2}
                  />
                </Field>
              )}
            </campForm.AppField>
          </CardHeader>
          <CardFooter className="border-b pb-4 mt-2 flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <campForm.SubmitButton
                name="Save Camp"
                onClick={() => campForm.handleSubmit()}
              >
                <SaveIcon className="size-4 sm:mr-2" />
                <span className="hidden sm:inline">Save Camp Details</span>
              </campForm.SubmitButton>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Camp</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{camp.name}&quot;?
                      This will also delete all year configurations. This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteCamp}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <campForm.StatusBadge schema={campUpdateSchema} />
          </CardFooter>
        </form>
      </campForm.AppForm>

      {/* Camp Year Section */}
      <campYearForm.AppForm>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <CardContent>
            <h4 className="text-sm font-medium text-muted-foreground mb-4">
              {year} Configuration
            </h4>

            <FieldSet>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <campYearForm.AppField
                  name="basePrice"
                  validators={{
                    onChange: ({ value }) =>
                      typeof value === "number" && value >= 0
                        ? undefined
                        : "Must be 0 or greater",
                  }}
                >
                  {(field) => (
                    <Field>
                      <FieldLabel>Base Price ($)</FieldLabel>
                      <field.WithErrors>
                        <field.TextInput
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={formatPriceForDisplay(field.state.value)}
                          onChange={(e) =>
                            field.handleChange(
                              parsePriceFromInput(e.target.value),
                            )
                          }
                        />
                      </field.WithErrors>
                    </Field>
                  )}
                </campYearForm.AppField>

                <campYearForm.AppField name="dayPrice">
                  {(field) => {
                    const isEnabled = field.state.value !== null;
                    return (
                      <Field>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`dayPrice-enabled-${camp.id}`}
                            checked={isEnabled}
                            onChange={(e) => {
                              if (e.target.checked) {
                                field.handleChange(0);
                              } else {
                                field.handleChange(null);
                              }
                            }}
                            className="size-4"
                          />
                          <FieldLabel
                            htmlFor={`dayPrice-enabled-${camp.id}`}
                            className="mb-0 cursor-pointer"
                          >
                            Day Price ($)
                          </FieldLabel>
                        </div>
                        <field.WithErrors>
                          <field.TextInput
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            disabled={!isEnabled}
                            value={
                              isEnabled
                                ? formatPriceForDisplay(field.state.value)
                                : ""
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              field.handleChange(
                                val === "" ? 0 : parsePriceFromInput(val),
                              );
                            }}
                          />
                        </field.WithErrors>
                      </Field>
                    );
                  }}
                </campYearForm.AppField>

                <campYearForm.AppField name="capacity">
                  {(field) => (
                    <Field>
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
                </campYearForm.AppField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <campYearForm.AppField name="startDate">
                  {(field) => (
                    <Field>
                      <FieldLabel>Start Date</FieldLabel>
                      <field.WithErrors>
                        <field.TextInput type="date" />
                      </field.WithErrors>
                    </Field>
                  )}
                </campYearForm.AppField>

                <campYearForm.AppField name="endDate">
                  {(field) => (
                    <Field>
                      <FieldLabel>End Date</FieldLabel>
                      <field.WithErrors>
                        <field.TextInput type="date" />
                      </field.WithErrors>
                    </Field>
                  )}
                </campYearForm.AppField>
              </div>
            </FieldSet>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <campYearForm.SubmitButton
                name={hasCampYear ? "Save Year" : "Add Year"}
                onClick={() => campYearForm.handleSubmit()}
                className="mt-2"
              >
                {hasCampYear ? (
                  <>
                    <SaveIcon className="size-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                      Save Year Configuration
                    </span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="size-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                      Add {year} Configuration
                    </span>
                  </>
                )}
              </campYearForm.SubmitButton>
              {hasCampYear && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Remove {year} Configuration
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove the {year} configuration
                        for &quot;{camp.name}&quot;? This action cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteCampYear}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <campYearForm.StatusBadge
              schema={hasCampYear ? campYearUpdateSchema : campYearInsertSchema}
            />
          </CardFooter>
        </form>
      </campYearForm.AppForm>
    </Card>
  );
}
