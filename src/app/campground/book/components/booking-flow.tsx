"use client";

import { ArrowLeftIcon, ClockIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import CheckoutForm from "@/components/stripe/embedded-checkout-form";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppForm } from "@/hooks/use-camp-form";
import { CHECKOUT_SESSION_MINUTES } from "@/lib/campground/booking";
import { bookingGuestSchema } from "@/lib/types/campground-schemas";
import { startBooking } from "../actions";

interface BookingFlowProps {
  siteId: string;
  checkIn: string;
  checkOut: string;
  maxOccupancy: number;
  defaultName: string;
  backHref: string;
}

export function BookingFlow({
  siteId,
  checkIn,
  checkOut,
  maxOccupancy,
  defaultName,
  backHref,
}: BookingFlowProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: {
      guestName: defaultName,
      guestPhone: "",
      partySize: 2 as number,
      notes: null as string | null,
    },
    validators: {
      onSubmit: bookingGuestSchema.refine((v) => v.partySize <= maxOccupancy, {
        path: ["partySize"],
        message: `This site fits at most ${maxOccupancy} ${maxOccupancy === 1 ? "person" : "people"}`,
      }),
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const result = await startBooking({
        ...value,
        siteId,
        checkIn,
        checkOut,
      });
      if (result.ok) {
        setClientSecret(result.data.clientSecret);
      } else {
        setError(result.error);
      }
    },
  });

  if (clientSecret) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClockIcon className="size-4" aria-hidden />
          We're holding this site for you for {CHECKOUT_SESSION_MINUTES} minutes
          while you pay.
        </p>
        <CheckoutForm clientSecret={clientSecret} />
      </div>
    );
  }

  return (
    <form.AppForm>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FieldSet className="gap-4">
          <form.AppField name="guestName">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="guestName">Name on the booking</FieldLabel>
                <field.WithErrors>
                  <field.TextInput autoComplete="name" />
                </field.WithErrors>
              </Field>
            )}
          </form.AppField>

          <form.AppField name="guestPhone">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="guestPhone">Phone number</FieldLabel>
                <field.WithErrors>
                  <field.TextInput
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="780-555-0123"
                  />
                </field.WithErrors>
              </Field>
            )}
          </form.AppField>

          <form.AppField name="partySize">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="partySize">
                  Number of people (up to {maxOccupancy})
                </FieldLabel>
                <field.WithErrors>
                  <Input
                    id="partySize"
                    type="number"
                    min={1}
                    max={maxOccupancy}
                    className="max-w-32"
                    value={
                      Number.isNaN(field.state.value) ? "" : field.state.value
                    }
                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                    onBlur={field.handleBlur}
                  />
                </field.WithErrors>
              </Field>
            )}
          </form.AppField>

          <form.AppField name="notes">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder="Anything we should know, e.g. arrival time or trailer length"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                />
              </Field>
            )}
          </form.AppField>
        </FieldSet>

        {error && (
          <div
            role="alert"
            className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300 rounded-md space-y-2"
          >
            <p>{error}</p>
            <Link href={backHref} className="underline">
              Back to available sites
            </Link>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-between">
          <Button variant="outline" asChild>
            <Link href={backHref}>
              <ArrowLeftIcon className="size-4" aria-hidden />
              Change site or dates
            </Link>
          </Button>
          <form.SubmitButton>Continue to payment</form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
