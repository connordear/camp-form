import {
  defaultValuesRegistration,
  RegistrationSchema,
} from "@/lib/types/registration-types";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { PropsWithChildren } from "react";

export function RootForm({ children }: PropsWithChildren) {
  const form = useForm({
    defaultValues: {
      registrations: [defaultValuesRegistration],
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: RegistrationSchema,
    },
  });
}
