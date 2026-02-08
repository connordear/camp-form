"use client";

import { useStore } from "@tanstack/react-form";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  createDiscount,
  deleteDiscount,
  updateDiscount,
} from "@/app/admin/discounts/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAppForm } from "@/hooks/use-camp-form";
import { DISCOUNT_CONDITION_TYPES, DISCOUNT_TYPES } from "@/lib/data/schema";
import type { Discount } from "@/lib/services/discount-service";
import {
  CONDITION_TYPE_LABELS,
  DISCOUNT_TYPE_LABELS,
  discountFormSchema,
} from "@/lib/types/discount-schemas";

interface DiscountDialogProps {
  /** If provided, dialog is in edit mode. Otherwise, create mode. */
  discount?: Discount;
  /** The trigger element that opens the dialog */
  trigger: React.ReactNode;
}

export function DiscountDialog({ discount, trigger }: DiscountDialogProps) {
  const isEditMode = !!discount;
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useAppForm({
    defaultValues: {
      name: discount?.name ?? "",
      description: discount?.description ?? (null as string | null),
      type: (discount?.type ?? "percentage") as (typeof DISCOUNT_TYPES)[number],
      amount: discount?.amount ?? 10,
      conditionType: (discount?.conditionType ??
        "deadline") as (typeof DISCOUNT_CONDITION_TYPES)[number],
      deadlineDate: discount?.deadlineDate ?? (null as string | null),
      minCampers: discount?.minCampers ?? (2 as number | null),
      isActive: discount?.isActive ?? true,
    },
    validators: {
      onSubmit: discountFormSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const toastId = toast.loading(
        isEditMode ? "Updating discount..." : "Creating discount...",
      );
      try {
        if (isEditMode) {
          await updateDiscount({ ...value, id: discount.id });
          toast.success("Discount updated", { id: toastId });
        } else {
          await createDiscount(value);
          toast.success("Discount created", { id: toastId });
          formApi.reset();
        }
        setIsOpen(false);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : `Failed to ${isEditMode ? "update" : "create"} discount`,
          { id: toastId },
        );
      }
    },
  });

  const handleDelete = async () => {
    if (!discount) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting discount...");
    try {
      await deleteDiscount(discount.id);
      toast.success("Discount deleted", { id: toastId });
      setIsOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete discount",
        { id: toastId },
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Price formatting helpers for fixed amount
  const formatAmountForDisplay = (
    cents: number,
    type: (typeof DISCOUNT_TYPES)[number],
  ): string => {
    if (type === "percentage") {
      return cents.toString();
    }
    return (cents / 100).toFixed(2);
  };

  const parseAmountFromInput = (
    value: string,
    type: (typeof DISCOUNT_TYPES)[number],
  ): number => {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return 0;
    if (type === "percentage") {
      return Math.min(100, Math.max(0, Math.round(num)));
    }
    return Math.round(num * 100);
  };

  const conditionType = useStore(
    form.store,
    (state) => state.values.conditionType,
  );
  const discountType = useStore(form.store, (state) => state.values.type);

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
              <DialogTitle>
                {isEditMode ? "Edit Discount" : "Add New Discount"}
              </DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? "Update this discount's configuration."
                  : "Create a discount that will be automatically applied at checkout."}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <FieldSet className="gap-4">
                <form.AppField name="name">
                  {(field) => (
                    <Field>
                      <FieldLabel>Discount Name *</FieldLabel>
                      <field.WithErrors>
                        <field.TextInput placeholder="e.g. Early Bird 2026" />
                      </field.WithErrors>
                    </Field>
                  )}
                </form.AppField>

                <form.AppField name="description">
                  {(field) => (
                    <Field>
                      <FieldLabel>Description</FieldLabel>
                      <Textarea
                        placeholder="Optional description for admin reference"
                        rows={2}
                        value={field.state.value ?? ""}
                        onChange={(e) =>
                          field.handleChange(e.target.value || null)
                        }
                      />
                    </Field>
                  )}
                </form.AppField>

                <div className="grid grid-cols-2 gap-4">
                  <form.AppField name="type">
                    {(field) => (
                      <Field>
                        <FieldLabel>Discount Type *</FieldLabel>
                        <Select
                          value={field.state.value}
                          onValueChange={(val) =>
                            field.handleChange(
                              val as (typeof DISCOUNT_TYPES)[number],
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DISCOUNT_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {DISCOUNT_TYPE_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  </form.AppField>

                  <form.AppField name="amount">
                    {(field) => (
                      <Field>
                        <FieldLabel>
                          Amount {discountType === "percentage" ? "(%)" : "($)"}{" "}
                          *
                        </FieldLabel>
                        <Input
                          type="number"
                          min="0"
                          max={discountType === "percentage" ? 100 : undefined}
                          step={discountType === "percentage" ? 1 : 0.01}
                          value={formatAmountForDisplay(
                            field.state.value,
                            discountType,
                          )}
                          onChange={(e) =>
                            field.handleChange(
                              parseAmountFromInput(
                                e.target.value,
                                discountType,
                              ),
                            )
                          }
                        />
                      </Field>
                    )}
                  </form.AppField>
                </div>

                <div className="border-t pt-4 mt-2">
                  <h4 className="text-sm font-medium mb-3">
                    Condition Configuration
                  </h4>

                  <form.AppField name="conditionType">
                    {(field) => (
                      <Field>
                        <FieldLabel>Apply When *</FieldLabel>
                        <Select
                          value={field.state.value}
                          onValueChange={(val) =>
                            field.handleChange(
                              val as (typeof DISCOUNT_CONDITION_TYPES)[number],
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DISCOUNT_CONDITION_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {CONDITION_TYPE_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  </form.AppField>

                  {conditionType === "deadline" && (
                    <form.AppField name="deadlineDate">
                      {(field) => (
                        <Field className="mt-4">
                          <FieldLabel>Deadline Date *</FieldLabel>
                          <field.WithErrors>
                            <field.DatePicker
                              placeholder="Select deadline"
                              fromYear={new Date().getFullYear()}
                              toYear={new Date().getFullYear() + 2}
                            />
                          </field.WithErrors>
                          <p className="text-xs text-muted-foreground mt-1">
                            Discount applies to checkouts completed on or before
                            this date.
                          </p>
                        </Field>
                      )}
                    </form.AppField>
                  )}

                  {conditionType === "sibling" && (
                    <form.AppField name="minCampers">
                      {(field) => (
                        <Field className="mt-4">
                          <FieldLabel>Minimum Campers *</FieldLabel>
                          <field.WithErrors>
                            <Input
                              type="number"
                              min="2"
                              value={field.state.value ?? 2}
                              onChange={(e) =>
                                field.handleChange(
                                  parseInt(e.target.value, 10) || 2,
                                )
                              }
                            />
                          </field.WithErrors>
                          <p className="text-xs text-muted-foreground mt-1">
                            Discount applies when this many or more unique
                            campers are in checkout.
                          </p>
                        </Field>
                      )}
                    </form.AppField>
                  )}
                </div>

                <form.AppField name="isActive">
                  {(field) => (
                    <Field className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FieldLabel className="mb-0">Active</FieldLabel>
                        <p className="text-sm text-muted-foreground">
                          {isEditMode
                            ? "Enable this discount"
                            : "Enable this discount immediately"}
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
                isEditMode
                  ? "flex-col gap-2 sm:flex-row sm:justify-between"
                  : undefined
              }
            >
              {isEditMode && (
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
                      <AlertDialogTitle>Delete Discount</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete &quot;{discount?.name}
                        &quot;? This will also delete the associated Stripe
                        coupon. This action cannot be undone.
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
                  {isEditMode ? "Save Changes" : "Create Discount"}
                </form.SubmitButton>
              </div>
            </DialogFooter>
          </form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
