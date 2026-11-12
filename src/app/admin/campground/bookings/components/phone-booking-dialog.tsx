"use client";

import { PhoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAppForm } from "@/hooks/use-camp-form";
import { nightsLabel, stayCost } from "@/lib/campground/booking";
import { isValidRange } from "@/lib/campground/calendar";
import { daysUntil } from "@/lib/campground/dates";
import { dollarsToCents, formatCents } from "@/lib/campground/money";
import type { Campsite } from "@/lib/services/campground-service";
import { adminBookingSchema } from "@/lib/types/campground-schemas";
import { createPhoneBooking } from "../actions";

interface PhoneBookingDialogProps {
  sites: Campsite[];
}

const emptyValues = {
  siteId: "",
  checkIn: "",
  checkOut: "",
  guestName: "",
  guestEmail: null as string | null,
  guestPhone: "",
  partySize: 2,
  notes: null as string | null,
  adminNotes: null as string | null,
  pricePaid: Number.NaN,
  sendConfirmation: true,
};

/** Record a booking taken by phone or email and paid for offline. */
export function PhoneBookingDialog({ sites }: PhoneBookingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paidText, setPaidText] = useState("");

  const form = useAppForm({
    defaultValues: emptyValues,
    validators: { onSubmit: adminBookingSchema },
    onSubmit: async ({ value, formApi }) => {
      const result = await createPhoneBooking(value);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Booking saved");
      formApi.reset();
      setPaidText("");
      setOpen(false);
      router.push(`/admin/campground/bookings/${result.bookingId}`);
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset();
      setPaidText("");
    }
    setOpen(next);
  };

  const options = sites
    .filter((s) => s.isActive)
    .map((s) => ({
      value: s.id,
      name: `${s.name} (${formatCents(s.nightlyRate)}/night, up to ${s.maxOccupancy})`,
    }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PhoneIcon aria-hidden />
          New booking
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <form.AppForm>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>New booking</DialogTitle>
              <DialogDescription>
                For a guest who booked by phone or email and paid by cash or
                e-transfer. It is confirmed straight away. Season and stay
                length limits don't apply here.
              </DialogDescription>
            </DialogHeader>

            <FieldSet className="gap-4 py-4">
              <form.AppField name="siteId">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="siteId">Site *</FieldLabel>
                    <field.WithErrors>
                      <field.Select
                        id="siteId"
                        options={options}
                        placeholder="Pick a site"
                        className="w-full"
                      />
                    </field.WithErrors>
                  </Field>
                )}
              </form.AppField>

              <div className="grid grid-cols-2 gap-4">
                <form.AppField name="checkIn">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="checkIn">Check-in *</FieldLabel>
                      <field.WithErrors>
                        <Input
                          id="checkIn"
                          type="date"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>
                <form.AppField name="checkOut">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="checkOut">Check-out *</FieldLabel>
                      <field.WithErrors>
                        <Input
                          id="checkOut"
                          type="date"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                        />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>
              </div>

              <form.Subscribe
                selector={(s) => [
                  s.values.siteId,
                  s.values.checkIn,
                  s.values.checkOut,
                ]}
              >
                {([siteId, checkIn, checkOut]) => {
                  const site = sites.find((s) => s.id === siteId);
                  if (!site || !isValidRange(checkIn, checkOut)) return null;
                  const nights = daysUntil(checkOut, checkIn);
                  return (
                    <p className="text-sm text-muted-foreground">
                      {nightsLabel(nights)} at {formatCents(site.nightlyRate)} ={" "}
                      <span className="font-medium text-foreground">
                        {formatCents(stayCost(site.nightlyRate, nights))}
                      </span>{" "}
                      before tax.
                    </p>
                  );
                }}
              </form.Subscribe>

              <form.AppField name="guestName">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="guestName">Guest name *</FieldLabel>
                    <field.WithErrors>
                      <field.TextInput autoComplete="off" />
                    </field.WithErrors>
                  </Field>
                )}
              </form.AppField>

              <div className="grid grid-cols-2 gap-4">
                <form.AppField name="guestPhone">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="guestPhone">Phone *</FieldLabel>
                      <field.WithErrors>
                        <field.TextInput type="tel" autoComplete="off" />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>
                <form.AppField name="partySize">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="partySize">People *</FieldLabel>
                      <field.WithErrors>
                        <Input
                          id="partySize"
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

              <form.AppField name="guestEmail">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="guestEmail">Email</FieldLabel>
                    <field.WithErrors>
                      <Input
                        id="guestEmail"
                        type="email"
                        autoComplete="off"
                        value={field.state.value ?? ""}
                        onChange={(e) =>
                          field.handleChange(e.target.value || null)
                        }
                        onBlur={field.handleBlur}
                      />
                    </field.WithErrors>
                    <p className="text-xs text-muted-foreground">
                      If it matches an account, the guest sees the booking under
                      My bookings.
                    </p>
                  </Field>
                )}
              </form.AppField>

              <form.AppField name="pricePaid">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="pricePaid">
                      Amount paid ($), tax included *
                    </FieldLabel>
                    <field.WithErrors>
                      <Input
                        id="pricePaid"
                        inputMode="decimal"
                        placeholder="94.50"
                        value={paidText}
                        onChange={(e) => {
                          setPaidText(e.target.value);
                          field.handleChange(dollarsToCents(e.target.value));
                        }}
                        onBlur={field.handleBlur}
                      />
                    </field.WithErrors>
                  </Field>
                )}
              </form.AppField>

              <form.AppField name="notes">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="notes">Guest notes</FieldLabel>
                    <Textarea
                      id="notes"
                      rows={2}
                      placeholder="e.g. arriving late, 25 ft trailer"
                      value={field.state.value ?? ""}
                      onChange={(e) =>
                        field.handleChange(e.target.value || null)
                      }
                    />
                  </Field>
                )}
              </form.AppField>

              <form.AppField name="adminNotes">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="adminNotes">Office notes</FieldLabel>
                    <Textarea
                      id="adminNotes"
                      rows={2}
                      placeholder="Only admins see these, e.g. paid by e-transfer Jun 3"
                      value={field.state.value ?? ""}
                      onChange={(e) =>
                        field.handleChange(e.target.value || null)
                      }
                    />
                  </Field>
                )}
              </form.AppField>

              <form.AppField name="sendConfirmation">
                {(field) => (
                  <Field className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FieldLabel htmlFor="sendConfirmation" className="mb-0">
                        Email a confirmation
                      </FieldLabel>
                      <p className="text-sm text-muted-foreground">
                        Sent only if you entered an email.
                      </p>
                    </div>
                    <div>
                      <Switch
                        id="sendConfirmation"
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <form.SubmitButton>Save booking</form.SubmitButton>
            </DialogFooter>
          </form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
