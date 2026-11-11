"use client";

import { CheckIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { useAppForm } from "@/hooks/use-camp-form";
import { dollarsToCents } from "@/lib/campground/money";
import { CAMPSITE_FEATURES, type CampsiteFeature } from "@/lib/data/schema";
import type { Campsite } from "@/lib/services/campground-service";
import {
  CAMPSITE_FEATURE_LABELS,
  campsiteFormSchema,
} from "@/lib/types/campground-schemas";
import { createSite, deleteSite, updateSite } from "../actions";

interface SiteDialogProps {
  /** If provided, the dialog edits this site. Otherwise it creates one. */
  site?: Campsite;
  /** Only sites with no bookings can be deleted. */
  canDelete?: boolean;
  defaultSortOrder?: number;
  trigger: React.ReactNode;
}

export function SiteDialog({
  site,
  canDelete = false,
  defaultSortOrder = 0,
  trigger,
}: SiteDialogProps) {
  const isEditMode = !!site;
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // The rate is typed in dollars and kept as text while editing.
  const [rateText, setRateText] = useState(
    site ? (site.nightlyRate / 100).toFixed(2) : "",
  );

  const form = useAppForm({
    defaultValues: {
      name: site?.name ?? "",
      features: (site?.features ?? []) as CampsiteFeature[],
      nightlyRate: site?.nightlyRate ?? Number.NaN,
      maxOccupancy: site?.maxOccupancy ?? 6,
      description: site?.description ?? (null as string | null),
      sortOrder: site?.sortOrder ?? defaultSortOrder,
      isActive: site?.isActive ?? true,
    },
    validators: {
      onSubmit: campsiteFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const toastId = toast.loading(
        isEditMode ? "Saving site..." : "Creating site...",
      );
      try {
        if (isEditMode) {
          await updateSite({ ...value, id: site.id });
          toast.success("Site saved", { id: toastId });
        } else {
          await createSite(value);
          toast.success("Site created", { id: toastId });
          formApi.reset();
          setRateText("");
        }
        setIsOpen(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save site",
          {
            id: toastId,
          },
        );
      }
    },
  });

  const handleDelete = async () => {
    if (!site) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting site...");
    try {
      await deleteSite(site.id);
      toast.success("Site deleted", { id: toastId });
      setIsOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete site",
        { id: toastId },
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form.AppForm>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Edit Site" : "Add Site"}</DialogTitle>
              <DialogDescription>
                Rates are per night, before tax.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <FieldSet className="gap-4">
                <form.AppField name="name">
                  {(field) => (
                    <Field>
                      <FieldLabel>Site name *</FieldLabel>
                      <field.WithErrors>
                        <field.TextInput placeholder="e.g. Site 7" />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>

                <div className="grid grid-cols-2 gap-4">
                  <form.AppField name="nightlyRate">
                    {(field) => (
                      <Field>
                        <FieldLabel>Nightly rate ($) *</FieldLabel>
                        <field.WithErrors>
                          <Input
                            inputMode="decimal"
                            placeholder="45.00"
                            value={rateText}
                            onChange={(e) => {
                              setRateText(e.target.value);
                              field.handleChange(
                                dollarsToCents(e.target.value),
                              );
                            }}
                            onBlur={field.handleBlur}
                          />
                        </field.WithErrors>
                      </Field>
                    )}
                  </form.AppField>

                  <form.AppField name="maxOccupancy">
                    {(field) => (
                      <Field>
                        <FieldLabel>Max people *</FieldLabel>
                        <field.WithErrors>
                          <Input
                            type="number"
                            min={1}
                            value={
                              Number.isNaN(field.state.value)
                                ? ""
                                : field.state.value
                            }
                            onChange={(e) =>
                              field.handleChange(e.target.valueAsNumber)
                            }
                          />
                        </field.WithErrors>
                      </Field>
                    )}
                  </form.AppField>
                </div>

                <form.AppField name="features">
                  {(field) => (
                    <Field>
                      <FieldLabel>Features</FieldLabel>
                      <div className="flex flex-wrap gap-2">
                        {CAMPSITE_FEATURES.map((feature) => {
                          const selected = field.state.value.includes(feature);
                          return (
                            <Button
                              key={feature}
                              type="button"
                              size="sm"
                              variant={selected ? "default" : "outline"}
                              aria-pressed={selected}
                              onClick={() =>
                                field.handleChange(
                                  selected
                                    ? field.state.value.filter(
                                        (f) => f !== feature,
                                      )
                                    : [...field.state.value, feature],
                                )
                              }
                            >
                              {selected && <CheckIcon className="size-3.5" />}
                              {CAMPSITE_FEATURE_LABELS[feature]}
                            </Button>
                          );
                        })}
                      </div>
                    </Field>
                  )}
                </form.AppField>

                <div className="grid grid-cols-2 gap-4">
                  <form.AppField name="sortOrder">
                    {(field) => (
                      <Field>
                        <FieldLabel>Display order</FieldLabel>
                        <field.WithErrors>
                          <Input
                            type="number"
                            value={
                              Number.isNaN(field.state.value)
                                ? ""
                                : field.state.value
                            }
                            onChange={(e) =>
                              field.handleChange(e.target.valueAsNumber)
                            }
                          />
                        </field.WithErrors>
                      </Field>
                    )}
                  </form.AppField>
                </div>

                <form.AppField name="description">
                  {(field) => (
                    <Field>
                      <FieldLabel>Description</FieldLabel>
                      <Textarea
                        placeholder="Shown to guests, e.g. lakeside, shaded, fits a 30 ft trailer"
                        rows={3}
                        value={field.state.value ?? ""}
                        onChange={(e) =>
                          field.handleChange(e.target.value || null)
                        }
                      />
                    </Field>
                  )}
                </form.AppField>

                <form.AppField name="isActive">
                  {(field) => (
                    <Field className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FieldLabel className="mb-0">Active</FieldLabel>
                        <p className="text-sm text-muted-foreground">
                          Inactive sites cannot be booked.
                        </p>
                      </div>
                      <div>
                        <Switch
                          checked={field.state.value}
                          onCheckedChange={(checked) =>
                            field.handleChange(checked)
                          }
                        />
                      </div>
                    </Field>
                  )}
                </form.AppField>
              </FieldSet>
            </div>

            <DialogFooter
              className={
                isEditMode && canDelete
                  ? "flex-col gap-2 sm:flex-row sm:justify-between"
                  : undefined
              }
            >
              {isEditMode && canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isDeleting}
                    >
                      <Trash2Icon className="size-4 mr-1" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete site</AlertDialogTitle>
                      <AlertDialogDescription>
                        Delete &quot;{site?.name}&quot;? This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <form.SubmitButton>
                  {isEditMode ? "Save Changes" : "Create Site"}
                </form.SubmitButton>
              </div>
            </DialogFooter>
          </form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
