import {
        Field,
        FieldContent,
        FieldError,
        FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
        Select as BaseSelect,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
} from "@/components/ui/select";
import { createFormHookContexts, createFormHook } from "@tanstack/react-form";
import { SelectHTMLAttributes } from "react";
import { z } from "zod";

// 1. Create Contexts
// export useFieldContext so your UI components can consume it
export const { fieldContext, formContext, useFieldContext } =
        createFormHookContexts();

// 2. Create Bound UI Components
// These components automatically know how to talk to your form state
export function TextInput({
        label,
        ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
        const field = useFieldContext<string>();
        return (
                <Field>
                        <FieldLabel>{label}</FieldLabel>
                        <FieldContent>
                                <Input
                                        {...props}
                                        className="border p-2 rounded"
                                        value={field.state.value}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        onBlur={field.handleBlur}
                                />
                                {field.state.meta.errors ? (
                                        <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
                                ) : null}
                        </FieldContent>
                </Field>
        );
}

export function Select({
        label,
        options,
        isNumber = true,
        ...props
}: {
        label: string;
        isNumber?: boolean;
        options: { value: string; name: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
        const field = useFieldContext<string | number>();
        return (
                <Field>
                        <FieldLabel>{label}</FieldLabel>
                        <FieldContent>
                                <BaseSelect
                                        value={(field.state.value ?? 1).toString()}
                                        onValueChange={(v) =>
                                                isNumber
                                                        ? field.handleChange(parseInt(v, 10))
                                                        : field.handleChange(v)
                                        }
                                >
                                        <SelectTrigger className="w-[300px]">
                                                <SelectValue placeholder="Camp" />
                                        </SelectTrigger>
                                        <SelectContent>
                                                {options.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value.toString()}>
                                                                {opt.name}
                                                        </SelectItem>
                                                ))}
                                        </SelectContent>
                                </BaseSelect>

                                {field.state.meta.errors ? (
                                        <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
                                ) : null}
                        </FieldContent>
                </Field>
        );
}

// 3. Generate the Hook
// This creates the `useCampForm` hook and the `withFieldGroup` HOC we need for campers
export const { useAppForm, withFieldGroup, withForm } = createFormHook({
        fieldContext,
        formContext,
        fieldComponents: {
                TextInput,
                Select,
                // Add Select, DatePicker, etc. here
        },
        formComponents: {},
});
