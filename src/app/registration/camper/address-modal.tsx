"use client";
import { createId } from "@paralleldrive/cuid2";
import { DialogTitle } from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Field, FieldSet } from "@/components/ui/field";
import { useAppForm } from "@/hooks/use-camp-form";
import { saveAddress } from "./actions";
import type { OpenAddressFormArgs } from "./form";
import { type AddressFormValues, addressInsertSchema } from "./schema";

const defaultAddressValues: AddressFormValues = {
  addressLine1: "",
  city: "",
  country: "",
  postalZip: "",
  stateProv: "",
  addressLine2: "",
  id: createId(),
};

type AddressFormProps = {
  address?: AddressFormValues;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  camperId?: OpenAddressFormArgs["camperId"];
};

export default function AddressForm({
  address = defaultAddressValues,
  isOpen,
  onOpenChange,
  camperId,
}: AddressFormProps) {
  const isNew = !address.postalZip;
  const router = useRouter();

  const form = useAppForm({
    defaultValues: address,
    validators: {
      onChange: addressInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await saveAddress(value, camperId);
      router.refresh();
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form.reset]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80%] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Add New Address" : "Edit Address"}
          </DialogTitle>
          <DialogDescription>
            {isNew
              ? "This address can be assigned to one or more campers."
              : "This address will be updated for all campers currently using it"}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldSet name="address" className="flex-1 min-h-0 overflow-y-auto">
            <form.AppField name="addressLine1">
              {(field) => (
                <Field>
                  <field.Label>Address</field.Label>
                  <field.WithErrors>
                    <field.TextInput autoComplete="street-address" />
                  </field.WithErrors>
                </Field>
              )}
            </form.AppField>

            <form.AppField name="addressLine2">
              {(field) => (
                <Field>
                  <field.Label>Address Line 2</field.Label>
                  <field.WithErrors>
                    <field.TextInput autoComplete="address-line2" />
                  </field.WithErrors>
                </Field>
              )}
            </form.AppField>

            <form.AppField name="city">
              {(field) => (
                <Field>
                  <field.Label>City</field.Label>
                  <field.WithErrors>
                    <field.TextInput autoComplete="address-level2" />
                  </field.WithErrors>
                </Field>
              )}
            </form.AppField>
            <form.AppField name="stateProv">
              {(field) => (
                <Field>
                  <field.Label>Province/State</field.Label>
                  <field.WithErrors>
                    <field.TextInput autoComplete="address-level1" />
                  </field.WithErrors>
                </Field>
              )}
            </form.AppField>

            <form.AppField name="country">
              {(field) => (
                <Field>
                  <field.Label>Country</field.Label>
                  <field.WithErrors>
                    <field.TextInput autoComplete="country" />
                  </field.WithErrors>
                </Field>
              )}
            </form.AppField>

            <form.AppField name="postalZip">
              {(field) => (
                <Field>
                  <field.Label>Postal/Zip Code</field.Label>
                  <field.WithErrors>
                    <field.TextInput autoComplete="postal-code" />
                  </field.WithErrors>
                </Field>
              )}
            </form.AppField>
          </FieldSet>
          <DialogFooter className="pt-3">
            <form.AppForm>
              <form.SubmitButton>Save</form.SubmitButton>
            </form.AppForm>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
