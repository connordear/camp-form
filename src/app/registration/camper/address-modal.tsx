"use client";
import { DialogTitle } from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { useAppForm } from "@/hooks/use-camp-form";
import { saveAddress } from "./actions";
import { type AddressFormValues, addressInsertSchema } from "./schema";

const defaultAddressValues: AddressFormValues = {
  addressLine1: "",
  city: "",
  country: "",
  postalZip: "",
  stateProv: "",
  addressLine2: "",
  id: undefined,
};

type AddressFormProps = {
  address?: AddressFormValues;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function AddressForm({
  address = defaultAddressValues,
  isOpen,
  onOpenChange,
}: AddressFormProps) {
  const router = useRouter();

  const form = useAppForm({
    defaultValues: address,
    validators: {
      onChange: addressInsertSchema,
    },
    onSubmit: async ({ value }) => {
      await saveAddress(value);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {!address.id ? "Add New Address" : "Edit Address"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <form.AppField name="addressLine1">
            {(field) => (
              <Field>
                <FieldLabel>Address</FieldLabel>
                <FieldContent>
                  <field.TextInput />
                </FieldContent>
              </Field>
            )}
          </form.AppField>

          <form.AppField name="addressLine2">
            {(field) => (
              <Field>
                <FieldLabel>Address Line 2</FieldLabel>
                <FieldContent>
                  <field.TextInput />
                </FieldContent>
              </Field>
            )}
          </form.AppField>

          <form.AppField name="city">
            {(field) => (
              <Field>
                <FieldLabel>City</FieldLabel>
                <FieldContent>
                  <field.TextInput />
                </FieldContent>
              </Field>
            )}
          </form.AppField>
          <form.AppField name="stateProv">
            {(field) => (
              <Field>
                <FieldLabel>Province/State</FieldLabel>
                <FieldContent>
                  <field.TextInput />
                </FieldContent>
              </Field>
            )}
          </form.AppField>

          <form.AppField name="country">
            {(field) => (
              <Field>
                <FieldLabel>Country</FieldLabel>
                <FieldContent>
                  <field.TextInput />
                </FieldContent>
              </Field>
            )}
          </form.AppField>

          <form.AppField name="postalZip">
            {(field) => (
              <Field>
                <FieldLabel>Postal/Zip Code</FieldLabel>
                <FieldContent>
                  <field.TextInput />
                </FieldContent>
              </Field>
            )}
          </form.AppField>
          <DialogFooter>
            <Button type="submit" onClick={form.handleSubmit}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
