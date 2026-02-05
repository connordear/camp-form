import type { Label } from "@radix-ui/react-label";
import { useFieldContext } from "@/hooks/use-camp-form";
import { FieldLabel } from "../ui/field";

export function FormFieldLabel(props: React.ComponentProps<typeof Label>) {
  const field = useFieldContext();

  return <FieldLabel htmlFor={field.name} {...props} />;
}
