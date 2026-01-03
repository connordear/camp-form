import { useFieldContext } from "@/hooks/use-camp-form";
import {
  Select as BaseSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  type SelectTriggerProps,
  SelectValue,
} from "../ui/select";

export default function Select({
  options,
  isNumber,
  placeholder = "Select",
  ...props
}: {
  isNumber?: boolean;
  placeholder?: string;
  options: { value: string; name: string }[];
} & SelectTriggerProps) {
  const field = useFieldContext<string | number>();
  return (
    <BaseSelect
      value={field.state.value?.toString()}
      onValueChange={(v) =>
        isNumber ? field.handleChange(parseInt(v, 10)) : field.handleChange(v)
      }
      disabled={props.disabled}
    >
      <SelectTrigger {...props} className={`${props.className ?? ""}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value.toString()}>
            {opt.name}
          </SelectItem>
        ))}
      </SelectContent>
    </BaseSelect>
  );
}
