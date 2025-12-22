import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select as BaseSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RegistrationFormValues } from "@/lib/types/form-types";
import { formSchema } from "@/lib/zod-schema";

export const { fieldContext, formContext, useFieldContext } =
  createFormHookContexts();

export function TextInput({
  onRemove,
  ...props
}: {
  onRemove?: () => void;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const field = useFieldContext<string>();
  return (
    <>
      <div className="flex items-center gap-1">
        <Input
          {...props}
          className="flex-1 border p-2 rounded"
          value={field.state.value ?? ""}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
        />
        {onRemove && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onRemove}
          >
            <XIcon />
          </Button>
        )}
      </div>
      {field.state.meta.errors ? (
        <FieldError>
          {field.state.meta.errors.map((e) => e.message).join(", ")}
        </FieldError>
      ) : null}
    </>
  );
}

export function Select({
  options,
  isNumber = true,
  onRemove,
}: {
  isNumber?: boolean;
  onRemove?: () => void;
  options: { value: string; name: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const field = useFieldContext<string | number>();
  return (
    <>
      <div className="flex gap-1">
        <BaseSelect
          value={(field.state.value ?? 1).toString()}
          onValueChange={(v) =>
            isNumber
              ? field.handleChange(parseInt(v, 10))
              : field.handleChange(v)
          }
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Camp" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </BaseSelect>
        {onRemove && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onRemove}
          >
            <XIcon />
          </Button>
        )}
      </div>

      {field.state.meta.errors ? (
        <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
      ) : null}
    </>
  );
}

const fieldComponents = {
  TextInput,
  Select,
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

// JUST USED TO GET THE TYPE OF form OBJECTS
const _formInferHelper = () => {
  return useAppForm({
    defaultValues: {} as RegistrationFormValues,
    validators: {
      onChange: formSchema,
    },
  });
};

export type CampFormApi = ReturnType<typeof _formInferHelper>;
