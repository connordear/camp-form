import { useFieldContext } from "@/hooks/use-camp-form";
import { FieldError } from "../ui/field";

export default function FieldErrors() {
  const field = useFieldContext();
  const errors = field.state.meta.errors || [];
  const hasErrors = errors.length > 0;

  return (
    <div
      aria-live="polite"
      className={`grid transition-all duration-200 ease-in-out ${
        hasErrors ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        {hasErrors && (
          <FieldError>
            {/* Note: If your parent <Field> has 'gap', you might want to move 
                 the top spacing here (pt-1) so it collapses to 0px nicely. */}
            {errors.map((e) => e.message).join(", ")}
          </FieldError>
        )}
      </div>
    </div>
  );
}
