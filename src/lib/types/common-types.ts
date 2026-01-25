import type { z } from "zod";
import { useAppForm } from "@/hooks/use-camp-form";
import type { campSchema, registrationStatusSchema } from "./common-schema";

export type Camp = z.infer<typeof campSchema>;

export type RegistrationStatus = z.infer<
  typeof registrationStatusSchema
>["status"];

const _hook = useAppForm;
class FormApiInfer<T> {
  api = _hook({ defaultValues: {} as T, validators: {} as any });
}

export type AppFormApi<T> = FormApiInfer<T>["api"];

export type FormStatus = "draft" | "complete" | "unsaved";
