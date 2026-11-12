import type * as React from "react";
import { Input } from "@/components/ui/input";

type NumberInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  /** NaN means the box is empty. */
  value: number;
  onChange: (value: number) => void;
};

/**
 * A number box for form state held as a `number`. An empty box is NaN, which
 * the zod number schemas reject with their "Enter a number" message.
 */
export function NumberInput({
  value,
  onChange,
  step = 1,
  ...props
}: NumberInputProps) {
  return (
    <Input
      type="number"
      step={step}
      value={Number.isNaN(value) ? "" : value}
      onChange={(e) => onChange(e.target.valueAsNumber)}
      {...props}
    />
  );
}
