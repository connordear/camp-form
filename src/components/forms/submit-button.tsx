import { Loader2 } from "lucide-react"; // Optional: for spinner
import type { ComponentProps } from "react";
import { useFormContext } from "@/hooks/use-camp-form"; // Your custom hook
import { Button } from "../ui/button"; // Your Shadcn/Base button

// 1. Inherit all props from your base Button
type BaseButtonProps = ComponentProps<typeof Button>;

type SubmitButtonProps = BaseButtonProps & {
  label?: string; // Optional: If you just want text
};

export default function SubmitButton({
  children,
  label,
  disabled,
  className,
  ...props
}: SubmitButtonProps) {
  const form = useFormContext();

  return (
    <form.Subscribe
      selector={(state) => [state.canSubmit, state.isSubmitting, state.isDirty]}
    >
      {([canSubmit, isSubmitting, isDirty]) => {
        return (
          <Button
            type="submit"
            disabled={!isDirty || disabled || isSubmitting || !canSubmit}
            className={className}
            {...props}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {label || children || "Saving..."}
              </>
            ) : (
              label || children || "Submit"
            )}
          </Button>
        );
      }}
    </form.Subscribe>
  );
}
