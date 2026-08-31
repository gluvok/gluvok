"use client";

/**
 * @file components/form/field-input.tsx
 * @description Dynamic form field input factory selector.
 * Instantiates the correct input component (standard input, combobox, image upload, checkbox)
 * based on field configuration properties.
 */

import { useWatch, type UseFormReturn, type FieldValues } from "react-hook-form";
import { EntityCombobox, RoleCombobox, UnitCombobox, TypeCombobox } from "@/components/combobox";
import { FieldType } from "@/lib/constants/enums";
import { type FieldConfig, getReferencedEntitySlug } from "@/lib/fields";
import { Checkbox } from "@/components/ui/checkbox";
import { StandardInput } from "./standard-input";
import { ImageUpload } from "./image/upload";

interface FormFieldInputProps {
  field: FieldConfig;
  form: UseFormReturn<FieldValues>;
  idPrefix: string;
  disabled?: boolean;
}

/**
 * FormFieldInput Component
 * Evaluates field.type and returns the designated component. Integrates with react-hook-form control state.
 */
export function FormFieldInput({ field, form, idPrefix, disabled }: FormFieldInputProps) {
  const referencedSlug = getReferencedEntitySlug(field.key);
  const fieldId = `${idPrefix}-field-${field.key}`;
  const value = useWatch({ control: form.control, name: field.key });
  const stringValue = value !== undefined && value !== null ? String(value) : "";

  switch (field.type) {
    case FieldType.IMAGES:
      return (
        <ImageUpload
          id={fieldId}
          value={Array.isArray(value) ? value : []}
          onChange={(urls) =>
            form.setValue(field.key, urls, { shouldValidate: true, shouldDirty: true })
          }
          disabled={disabled}
        />
      );
    case FieldType.TEXT:
    case FieldType.NUMBER:
    case FieldType.PASSWORD:
      return <StandardInput field={field} fieldId={fieldId} form={form} disabled={disabled} />;
    case FieldType.CHECKBOX:
      return (
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id={fieldId}
            checked={Boolean(value)}
            onCheckedChange={(checked) =>
              form.setValue(field.key, checked, { shouldValidate: true, shouldDirty: true })
            }
            disabled={disabled}
          />
          <label
            htmlFor={fieldId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {field.label}
          </label>
        </div>
      );
    case FieldType.ROLE:
      return (
        <RoleCombobox
          id={`${idPrefix}-role-trigger`}
          value={stringValue}
          onChange={(val) =>
            form.setValue(field.key, val, { shouldValidate: true, shouldDirty: true })
          }
          disabled={disabled}
        />
      );
    case FieldType.UNIT:
      return (
        <UnitCombobox
          id={`${idPrefix}-unit-trigger`}
          value={stringValue}
          onChange={(val) =>
            form.setValue(field.key, val, { shouldValidate: true, shouldDirty: true })
          }
        />
      );
    case FieldType.TYPE:
      return (
        <TypeCombobox
          id={`${idPrefix}-type-trigger`}
          value={stringValue}
          onChange={(val) =>
            form.setValue(field.key, val, { shouldValidate: true, shouldDirty: true })
          }
        />
      );
    default:
      if (referencedSlug) {
        return (
          <EntityCombobox
            id={fieldId}
            entitySlug={referencedSlug}
            value={stringValue}
            onChange={(val) =>
              form.setValue(field.key, val, { shouldValidate: true, shouldDirty: true })
            }
            disabled={disabled}
          />
        );
      }
      return <StandardInput field={field} fieldId={fieldId} form={form} disabled={disabled} />;
  }
}
