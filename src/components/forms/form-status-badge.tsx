import { Loader2 } from "lucide-react";
import type { ZodTypeAny } from "zod";
import { useFormContext } from "@/hooks/use-camp-form";
import type { FormStatus } from "@/lib/types/common-types";
import { Badge } from "../ui/badge";

const statusConfig: Record<
  FormStatus | "submitting",
  {
    variant: "default" | "outline" | "secondary" | "destructive" | "success";
    label: string;
  }
> = {
  complete: { variant: "success", label: "COMPLETE" },
  draft: { variant: "secondary", label: "DRAFT" },
  unsaved: { variant: "destructive", label: "UNSAVED" },
  submitting: { variant: "outline", label: "SAVING..." },
};

type StaticFormStatusBadgeProps = {
  status: FormStatus | "submitting";
};

/**
 * Static status badge for components that don't use TanStack Form.
 * Accepts a status prop directly instead of deriving from form state.
 */
export function StaticFormStatusBadge({ status }: StaticFormStatusBadgeProps) {
  const { variant, label } = statusConfig[status];

  return (
    <Badge variant={variant}>
      {status === "submitting" && (
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      )}
      {label}
    </Badge>
  );
}

type FormStatusBadgeProps = {
  /**
   * Optional Zod schema for silent validation.
   * When provided, uses schema.safeParse() to determine if form is complete,
   * without triggering error displays. This allows accurate status display
   * even when form validation only runs onSubmit.
   */
  schema?: ZodTypeAny;
};

/**
 * Form-aware status badge that derives status from TanStack Form state.
 * Must be used within a form.AppForm context.
 *
 * Status logic:
 * - submitting: form is currently submitting
 * - unsaved: form values differ from default/saved values
 * - complete: form values match default/saved and form is valid
 * - draft: form values match default/saved but form is invalid
 *
 * Note: Uses `isDefaultValue` instead of `isDirty` because `isDirty` is sticky
 * (stays true even after undoing changes), while `isDefaultValue` dynamically
 * compares current values against defaultValues using deep equality.
 */
export default function FormStatusBadge({ schema }: FormStatusBadgeProps) {
  const form = useFormContext();

  return (
    <form.Subscribe
      selector={(state) => ({
        isDefaultValue: state.isDefaultValue,
        isValid: state.isValid,
        isSubmitting: state.isSubmitting,
        values: state.values,
      })}
    >
      {({ isDefaultValue, isValid, isSubmitting, values }) => {
        const hasUnsavedChanges = !isDefaultValue;

        // If a schema is provided, use silent validation to determine completeness
        // Otherwise fall back to TanStack Form's isValid state
        const isComplete = schema ? schema.safeParse(values).success : isValid;

        const status = isSubmitting
          ? "submitting"
          : hasUnsavedChanges
            ? "unsaved"
            : isComplete
              ? "complete"
              : "draft";

        return <StaticFormStatusBadge status={status} />;
      }}
    </form.Subscribe>
  );
}
