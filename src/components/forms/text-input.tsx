import { useFieldContext } from "@/hooks/use-camp-form";
import { Input } from "../ui/input";

export default function TextInput({
  value: customValue,
  onChange: customOnChange,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const field = useFieldContext<string>();

  // Use custom value/onChange if provided, otherwise use field context
  const value =
    customValue !== undefined ? customValue : (field.state.value ?? "");
  const handleChange = customOnChange
    ? customOnChange
    : (e: React.ChangeEvent<HTMLInputElement>) =>
        field.handleChange(e.target.value);

  return (
    <Input
      {...props}
      type="text"
      name={field.name}
      id={field.name}
      className="flex-1 border p-2 rounded"
      value={value}
      onChange={handleChange}
      onBlur={field.handleBlur}
    />
  );
}
