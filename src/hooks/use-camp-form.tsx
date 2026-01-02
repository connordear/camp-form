import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import AutoSaver from "@/components/forms/auto-saver";
import { WithErrors } from "@/components/forms/field-errors";
import Select from "@/components/forms/select";
import SubmitButton from "@/components/forms/submit-button";
import TextInput from "@/components/forms/text-input";

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

const fieldComponents = {
  TextInput,
  Select,
  WithErrors,
};
const formComponents = {
  SubmitButton,
  AutoSaver,
};

// 3. Generate the Hook
// This creates the `useCampForm` hook and the `withFieldGroup` HOC we need for campers
export const { useAppForm, withFieldGroup, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents,
  formComponents,
});
