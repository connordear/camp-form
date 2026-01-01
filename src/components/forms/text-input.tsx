import { useFieldContext } from "@/hooks/use-camp-form";
import { Input } from "../ui/input";

export default function TextInput({
  ...props
}: {} & React.InputHTMLAttributes<HTMLInputElement>) {
  const field = useFieldContext<string>();
  return (
    <Input
      {...props}
      className="flex-1 border p-2 rounded"
      value={field.state.value ?? ""}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
    />
  );
}
