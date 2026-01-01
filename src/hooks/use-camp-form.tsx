import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import FieldErrors from "@/components/forms/field-errors";
import Select from "@/components/forms/select";
import TextInput from "@/components/forms/text-input";

export const { fieldContext, formContext, useFieldContext } =
  createFormHookContexts();

const fieldComponents = {
  TextInput,
  Select,
  FieldErrors,
};
const formComponents = {};

// 3. Generate the Hook
// This creates the `useCampForm` hook and the `withFieldGroup` HOC we need for campers
export const { useAppForm, withFieldGroup, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents,
  formComponents,
});
