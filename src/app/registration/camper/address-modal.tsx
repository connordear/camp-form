"use client";
import { useRouter } from "next/navigation";
import { useAppForm } from "@/hooks/use-camp-form";
import { type AddressFormValues, addressInsertSchema } from "./schema";

const defaultAddressValues: AddressFormValues = {
  addressLine1: "",
  city: "",
  country: "",
  postalZip: "",
  stateProv: "",
  addressLine2: "",
  id: 0,
};

type AddressFormProps = {
  address?: AddressFormValues;
};

export default function AddressForm({
  address = defaultAddressValues,
}: AddressFormProps) {
  const router = useRouter();

  const form = useAppForm({
    defaultValues: address,
    validators: {
      onChange: addressInsertSchema,
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    ></form>
  );
}
