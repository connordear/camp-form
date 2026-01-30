import { useFieldContext } from "@/hooks/use-camp-form";
import { Textarea } from "../ui/textarea";

export default function TextArea({
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const field = useFieldContext<string>();
  return (
    <Textarea
      {...props}
      className="flex-1 border p-2 rounded"
      value={field.state.value ?? ""}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
    />
  );
}
