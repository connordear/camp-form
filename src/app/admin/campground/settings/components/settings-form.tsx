"use client";

import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAppForm } from "@/hooks/use-camp-form";
import type { CancellationTier } from "@/lib/data/schema";
import type { CampgroundSettings } from "@/lib/services/campground-service";
import { campgroundSettingsFormSchema } from "@/lib/types/campground-schemas";
import { updateCampgroundSettings } from "../actions";
import { TierEditor } from "./tier-editor";

interface SettingsFormProps {
  settings: CampgroundSettings;
}

function NumberInput({
  value,
  onChange,
  onBlur,
  min = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
  min?: number;
}) {
  return (
    <Input
      type="number"
      min={min}
      step={1}
      value={Number.isNaN(value) ? "" : value}
      onChange={(e) => onChange(e.target.valueAsNumber)}
      onBlur={onBlur}
    />
  );
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const thisYear = new Date().getFullYear();

  const form = useAppForm({
    defaultValues: {
      isBookingOpen: settings.isBookingOpen,
      seasonStart: settings.seasonStart,
      seasonEnd: settings.seasonEnd,
      minNights: settings.minNights,
      maxNights: settings.maxNights,
      maxAdvanceDays: settings.maxAdvanceDays,
      checkInTime: settings.checkInTime,
      checkOutTime: settings.checkOutTime,
      cancellationTiers: settings.cancellationTiers as CancellationTier[],
      policyText: settings.policyText,
    },
    validators: {
      onSubmit: campgroundSettingsFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const toastId = toast.loading("Saving settings...");
      try {
        const saved = await updateCampgroundSettings(value);
        toast.success("Settings saved", { id: toastId });
        // Reset to the saved values (tiers come back sorted) so the form is clean.
        formApi.reset({
          isBookingOpen: saved.isBookingOpen,
          seasonStart: saved.seasonStart,
          seasonEnd: saved.seasonEnd,
          minNights: saved.minNights,
          maxNights: saved.maxNights,
          maxAdvanceDays: saved.maxAdvanceDays,
          checkInTime: saved.checkInTime,
          checkOutTime: saved.checkOutTime,
          cancellationTiers: saved.cancellationTiers,
          policyText: saved.policyText,
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save settings",
          { id: toastId },
        );
      }
    },
  });

  return (
    <form.AppForm>
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Online booking</CardTitle>
            <CardDescription>
              Keep this off until real sites, rates, season dates and policy are
              entered.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form.AppField name="isBookingOpen">
              {(field) => (
                <Field className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FieldLabel className="mb-0">Booking open</FieldLabel>
                    <p className="text-sm text-muted-foreground">
                      When off, guests can browse but not book.
                    </p>
                  </div>
                  <div>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked)}
                    />
                  </div>
                </Field>
              )}
            </form.AppField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Season and stay limits</CardTitle>
            <CardDescription>
              Leave a season date empty for no limit on that side.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField name="seasonStart">
                {(field) => (
                  <Field>
                    <FieldLabel>First bookable night</FieldLabel>
                    <field.WithErrors>
                      <field.DatePicker
                        placeholder="No start limit"
                        fromYear={thisYear}
                        toYear={thisYear + 3}
                      />
                    </field.WithErrors>
                  </Field>
                )}
              </form.AppField>
              <form.AppField name="seasonEnd">
                {(field) => (
                  <Field>
                    <FieldLabel>Last check-out date</FieldLabel>
                    <field.WithErrors>
                      <field.DatePicker
                        placeholder="No end limit"
                        fromYear={thisYear}
                        toYear={thisYear + 3}
                      />
                    </field.WithErrors>
                  </Field>
                )}
              </form.AppField>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <form.AppField name="minNights">
                {(field) => (
                  <Field>
                    <FieldLabel>Minimum nights</FieldLabel>
                    <field.WithErrors>
                      <NumberInput
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                      />
                    </field.WithErrors>
                  </Field>
                )}
              </form.AppField>
              <form.AppField name="maxNights">
                {(field) => (
                  <Field>
                    <FieldLabel>Maximum nights</FieldLabel>
                    <field.WithErrors>
                      <NumberInput
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                      />
                    </field.WithErrors>
                  </Field>
                )}
              </form.AppField>
              <form.AppField name="maxAdvanceDays">
                {(field) => (
                  <Field>
                    <FieldLabel>Book up to (days ahead)</FieldLabel>
                    <field.WithErrors>
                      <NumberInput
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                      />
                    </field.WithErrors>
                  </Field>
                )}
              </form.AppField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField name="checkInTime">
                {(field) => (
                  <Field>
                    <FieldLabel>Check-in time</FieldLabel>
                    <field.WithErrors>
                      <Input
                        type="time"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </field.WithErrors>
                  </Field>
                )}
              </form.AppField>
              <form.AppField name="checkOutTime">
                {(field) => (
                  <Field>
                    <FieldLabel>Check-out time</FieldLabel>
                    <field.WithErrors>
                      <Input
                        type="time"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                      />
                    </field.WithErrors>
                  </Field>
                )}
              </form.AppField>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cancellation policy</CardTitle>
            <CardDescription>
              The refund is a percentage of the full amount paid, tax included.
              A cancellation that matches no tier gets no refund.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form.AppField name="cancellationTiers">
              {(field) => (
                <TierEditor
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              )}
            </form.AppField>

            <form.AppField name="policyText">
              {(field) => (
                <Field>
                  <FieldLabel>Extra policy wording (optional)</FieldLabel>
                  <Textarea
                    rows={3}
                    placeholder="Shown to guests alongside the refund tiers"
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value || null)}
                  />
                </Field>
              )}
            </form.AppField>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <form.SubmitButton>Save settings</form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
