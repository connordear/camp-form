import { useFieldContext } from "@/hooks/use-camp-form";
import { Switch as BaseSwitch } from "../ui/switch";

export default function Switch({
  ...props
}: React.ComponentProps<typeof BaseSwitch>) {
  const field = useFieldContext<boolean>();
  return (
    <BaseSwitch
      {...props}
      checked={field.state.value ?? false}
      onCheckedChange={(checked) => field.handleChange(checked)}
      onBlur={field.handleBlur}
    />
  );
}
