/**
 * @file components/form/standard-input.tsx
 * @description Standard HTML text/number input fields, with validation and transform-on-change hook bindings.
 */

"use client";

import { type UseFormReturn, type FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { type FieldConfig } from "@/lib/fields";
import { FieldType } from "@/lib/constants/enums";
import { cn } from "@/lib/utils";

interface StandardInputProps {
  field: FieldConfig;
  form: UseFormReturn<FieldValues>;
  fieldId: string;
  disabled?: boolean;
}

/**
 * StandardInput Component
 * Text/number input field registering onChange hooks and transform functions to hook-form state.
 */
export function StandardInput({ field, form, fieldId, disabled }: StandardInputProps) {
  const inputType =
    field.type === FieldType.PASSWORD
      ? "password"
      : field.type === FieldType.NUMBER
        ? "number"
        : "text";

  return (
    <Input
      id={fieldId}
      type={inputType}
      inputMode={field.inputMode}
      disabled={disabled}
      autoComplete={inputType === "password" ? "new-password" : undefined}
      step={field.type === FieldType.NUMBER ? "any" : undefined}
      {...form.register(field.key, {
        onChange: (e) => {
          if (field.transformOnChange) {
            e.target.value = field.transformOnChange(e.target.value);
          }
        },
      })}
      placeholder={field.placeholder}
      className={cn(
        "h-9 text-xs focus-visible:ring-1 focus-visible:ring-primary/50 transition-shadow",
        field.className,
      )}
    />
  );
}
