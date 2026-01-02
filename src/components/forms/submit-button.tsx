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
    // 2. Subscribe to form state
    // We listen to 'isSubmitting' (for loading) and 'canSubmit' (validation status)
    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
      {([canSubmit, isSubmitting]) => (
        <Button
          type="submit"
          // Disable if:
          // 1. Manually disabled prop is passed
          // 2. Form is currently submitting
          // 3. Form cannot be submitted (optional, removes ability to click to see errors)
          disabled={disabled || isSubmitting || !canSubmit}
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
      )}
    </form.Subscribe>
  );
}
