"use client";

/**
 * @file components/form/standard-input.tsx
 * @description Standard HTML text/number input fields, with validation and transform-on-change hook bindings.
 */

import { type UseFormReturn, type FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { type FieldConfig } from "@/lib/fields";
import { FieldType, AutoComplete, InputStep } from "@/lib/constants/enums";
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
      ? FieldType.PASSWORD
      : field.type === FieldType.NUMBER
        ? FieldType.NUMBER
        : FieldType.TEXT;

  return (
    <Input
      id={fieldId}
      type={inputType}
      inputMode={field.inputMode}
      disabled={disabled}
      autoComplete={inputType === FieldType.PASSWORD ? AutoComplete.NEW_PASSWORD : undefined}
      step={field.type === FieldType.NUMBER ? InputStep.ANY : undefined}
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
