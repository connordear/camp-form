"use client";

import { BanIcon, CheckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { useAppForm } from "@/hooks/use-camp-form";
import type { Campsite } from "@/lib/services/campground-service";
import { blockNightsSchema } from "@/lib/types/campground-schemas";
import { blockSiteNights } from "../actions";

/** Take nights off sale on one or more sites, for repairs, staff use etc. */
export function BlockNightsDialog({ sites }: { sites: Campsite[] }) {
  const [open, setOpen] = useState(false);
  const activeIds = sites.filter((s) => s.isActive).map((s) => s.id);

  const form = useAppForm({
    defaultValues: {
      siteIds: [] as string[],
      firstNight: "",
      lastNight: "",
      reason: "",
    },
    validators: { onSubmit: blockNightsSchema },
    onSubmit: async ({ value, formApi }) => {
      const result = await blockSiteNights(value);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const count = new Set(value.siteIds).size;
      toast.success(
        count > 1 ? `Nights blocked on ${count} sites` : "Nights blocked",
      );
      formApi.reset();
      setOpen(false);
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset();
    setOpen(next);
  };

  const dateField = (name: "firstNight" | "lastNight", label: string) => (
    <form.AppField name={name}>
      {(field) => (
        <Field>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <field.WithErrors>
            <Input
              id={name}
              type="date"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </field.WithErrors>
        </Field>
      )}
    </form.AppField>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <BanIcon aria-hidden />
          Block nights
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <form.AppForm>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>Block nights</DialogTitle>
              <DialogDescription>
                Guests can't book a site on blocked nights. Nights that are
                already booked can't be blocked; cancel the booking first.
              </DialogDescription>
            </DialogHeader>

            <FieldSet className="gap-4 py-4">
              <form.AppField name="siteIds">
                {(field) => {
                  const selected = field.state.value;
                  const toggle = (id: string) =>
                    field.handleChange(
                      selected.includes(id)
                        ? selected.filter((s) => s !== id)
                        : [...selected, id],
                    );
                  const allActive =
                    activeIds.length > 0 &&
                    activeIds.every((id) => selected.includes(id));
                  return (
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium mb-2">
                        Sites *
                      </legend>
                      <field.WithErrors>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                          {sites.map((s) => {
                            const on = selected.includes(s.id);
                            return (
                              <Button
                                key={s.id}
                                type="button"
                                size="sm"
                                variant={on ? "default" : "outline"}
                                aria-pressed={on}
                                onClick={() => toggle(s.id)}
                                onBlur={field.handleBlur}
                              >
                                {on && (
                                  <CheckIcon className="size-3.5" aria-hidden />
                                )}
                                {s.isActive ? s.name : `${s.name} (inactive)`}
                              </Button>
                            );
                          })}
                        </div>
                      </field.WithErrors>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() =>
                          field.handleChange(allActive ? [] : activeIds)
                        }
                      >
                        {allActive ? "Clear sites" : "Select all active sites"}
                      </Button>
                    </fieldset>
                  );
                }}
              </form.AppField>
              <div className="grid grid-cols-2 gap-4">
                {dateField("firstNight", "First night *")}
                {dateField("lastNight", "Last night *")}
              </div>
              <form.AppField name="reason">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="reason">Reason *</FieldLabel>
                    <field.WithErrors>
                      <field.TextInput
                        placeholder="e.g. Power repairs"
                        autoComplete="off"
                      />
                    </field.WithErrors>
                  </Field>
                )}
              </form.AppField>
            </FieldSet>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <form.SubmitButton>Block nights</form.SubmitButton>
            </DialogFooter>
          </form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
