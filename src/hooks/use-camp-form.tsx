import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import AutoSaver from "@/components/forms/auto-saver";
import DatePicker from "@/components/forms/date-picker";
import { WithErrors } from "@/components/forms/field-errors";
import { FormFieldLabel } from "@/components/forms/field-label";
import FormStatusBadge from "@/components/forms/form-status-badge";
import Select from "@/components/forms/select";
import SubmitButton from "@/components/forms/submit-button";
import Switch from "@/components/forms/switch";
import TextArea from "@/components/forms/text-area";
import TextInput from "@/components/forms/text-input";

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

const fieldComponents = {
  DatePicker,
  TextInput,
  TextArea,
  Select,
  Switch,
  WithErrors,
  Label: FormFieldLabel,
};
const formComponents = {
  SubmitButton,
  AutoSaver,
  StatusBadge: FormStatusBadge,
};

// 3. Generate the Hook
// This creates the `useCampForm` hook and the `withFieldGroup` HOC we need for campers
export const { useAppForm, withFieldGroup, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents,
  formComponents,
});
