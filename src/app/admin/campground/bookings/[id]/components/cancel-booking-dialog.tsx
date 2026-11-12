"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { dollarsToCents, formatCents } from "@/lib/campground/money";
import { describeRefund } from "@/lib/campground/policy";
import { cancelBookingAsAdmin } from "../../actions";

interface CancelBookingDialogProps {
  bookingId: string;
  summary: string;
  pricePaid: number;
  paidOffline: boolean;
  /** Worked out on the server from the booking's own policy, for today. */
  policy: { percent: number; amount: number };
  guestEmail: string | null;
}

export function CancelBookingDialog({
  bookingId,
  summary,
  pricePaid,
  paidOffline,
  policy,
  guestEmail,
}: CancelBookingDialogProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [amountText, setAmountText] = useState("");
  const [notify, setNotify] = useState(Boolean(guestEmail));
  const [pending, startTransition] = useTransition();

  const customAmount = dollarsToCents(amountText);
  const amount = custom ? customAmount : policy.amount;
  const amountError = !custom
    ? null
    : Number.isNaN(customAmount)
      ? "Enter dollars and cents, e.g. 25.00"
      : customAmount > pricePaid
        ? `Can't be more than the ${formatCents(pricePaid)} paid`
        : null;

  const reset = () => {
    setCustom(false);
    setAmountText("");
    setNotify(Boolean(guestEmail));
  };

  const confirm = () =>
    startTransition(async () => {
      const result = await cancelBookingAsAdmin({
        bookingId,
        refundAmount: amount,
        notifyGuest: notify,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        amount > 0
          ? `Booking cancelled, ${formatCents(amount)} refunded`
          : "Booking cancelled",
      );
      setOpen(false);
      reset();
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">Cancel booking</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>
            {summary}. The nights go back on sale straight away. This can't be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium" id="refund-choice">
              Refund
            </p>
            <ButtonGroup aria-labelledby="refund-choice">
              <Button
                type="button"
                size="sm"
                variant={custom ? "outline" : "default"}
                aria-pressed={!custom}
                onClick={() => setCustom(false)}
              >
                Policy: {formatCents(policy.amount)}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={custom ? "default" : "outline"}
                aria-pressed={custom}
                onClick={() => setCustom(true)}
              >
                Different amount
              </Button>
            </ButtonGroup>
            <p className="text-sm text-muted-foreground">
              {describeRefund(policy.percent)} of the {formatCents(pricePaid)}{" "}
              paid, under the policy the guest booked with.
            </p>
          </div>

          {custom && (
            <Field>
              <FieldLabel htmlFor="refundAmount">Refund amount ($)</FieldLabel>
              <Input
                id="refundAmount"
                inputMode="decimal"
                placeholder={(policy.amount / 100).toFixed(2)}
                value={amountText}
                aria-invalid={amountError ? true : undefined}
                aria-describedby="refundAmount-error"
                onChange={(e) => setAmountText(e.target.value)}
                autoFocus
              />
              {amountError && amountText && (
                <p id="refundAmount-error" className="text-sm text-destructive">
                  {amountError}
                </p>
              )}
            </Field>
          )}

          <p className="rounded-md border bg-muted/50 p-3 text-sm">
            {paidOffline
              ? "Paid offline, so no money moves here. The refund is recorded so you know what to hand back."
              : "The refund goes back to the guest's card through Stripe."}
          </p>

          <div className="flex items-center justify-between gap-4">
            <label htmlFor="notifyGuest" className="text-sm">
              Email the guest
              {!guestEmail && (
                <span className="block text-muted-foreground">
                  No email on this booking
                </span>
              )}
            </label>
            <Switch
              id="notifyGuest"
              checked={notify}
              disabled={!guestEmail}
              onCheckedChange={setNotify}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Keep booking
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || amountError !== null}
            onClick={confirm}
          >
            {pending
              ? "Cancelling..."
              : !Number.isNaN(amount) && amount > 0
                ? `Cancel and refund ${formatCents(amount)}`
                : "Cancel with no refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
