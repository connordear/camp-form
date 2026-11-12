"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { NumberInput } from "@/components/forms/number-input";
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
import { createSite, updateSite } from "../actions";

interface SiteDialogProps {
  /** If provided, the dialog edits this site. Otherwise it creates one. */
  site?: Campsite;
  defaultSortOrder?: number;
  /** Element that opens the dialog. Omit when controlling `open` instead. */
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SiteDialog({
  site,
  defaultSortOrder = 0,
  trigger,
  open,
  onOpenChange,
}: SiteDialogProps) {
  const isEditMode = !!site;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;
  // The rate is typed in dollars and kept as text while editing.
  const initialRateText = site ? (site.nightlyRate / 100).toFixed(2) : "";
  const [rateText, setRateText] = useState(initialRateText);

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
        const result = isEditMode
          ? await updateSite({ ...value, id: site.id })
          : await createSite(value);
        if (!result.ok) {
          toast.error(result.error, { id: toastId });
          return;
        }
        if (isEditMode) {
          toast.success("Site saved", { id: toastId });
        } else {
          toast.success("Site created", { id: toastId });
          formApi.reset();
          setRateText("");
        }
        setIsOpen(false);
      } catch {
        toast.error("Failed to save site", { id: toastId });
      }
    },
  });

  // Closing without saving throws away unsaved edits.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset();
      setRateText(initialRateText);
    }
    setIsOpen(next);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
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
                      <FieldLabel htmlFor="name">Site name *</FieldLabel>
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
                        <FieldLabel htmlFor="nightlyRate">
                          Nightly rate ($) *
                        </FieldLabel>
                        <field.WithErrors>
                          <Input
                            id="nightlyRate"
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
                        <FieldLabel htmlFor="maxOccupancy">
                          Max people *
                        </FieldLabel>
                        <field.WithErrors>
                          <NumberInput
                            id="maxOccupancy"
                            min={1}
                            value={field.state.value}
                            onChange={field.handleChange}
                            onBlur={field.handleBlur}
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
                        <FieldLabel htmlFor="sortOrder">
                          Display order
                        </FieldLabel>
                        <field.WithErrors>
                          <NumberInput
                            id="sortOrder"
                            value={field.state.value}
                            onChange={field.handleChange}
                            onBlur={field.handleBlur}
                          />
                        </field.WithErrors>
                      </Field>
                    )}
                  </form.AppField>
                </div>

                <form.AppField name="description">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="description">Description</FieldLabel>
                      <Textarea
                        id="description"
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
                        <FieldLabel htmlFor="isActive" className="mb-0">
                          Active
                        </FieldLabel>
                        <p className="text-sm text-muted-foreground">
                          Inactive sites cannot be booked.
                        </p>
                      </div>
                      <div>
                        <Switch
                          id="isActive"
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

            <DialogFooter>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
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
