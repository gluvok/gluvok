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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
    case FieldType.SWITCH:
      return (
        <div className="flex items-center justify-between w-full">
          <Label
            htmlFor={fieldId}
            className="text-xs font-semibold cursor-pointer select-none text-foreground flex items-center gap-2"
          >
            {field.icon && <field.icon className="h-4 w-4 text-primary" />}
            {field.label}
          </Label>
          <Switch
            id={fieldId}
            checked={Boolean(value)}
            onCheckedChange={(checked) =>
              form.setValue(field.key, checked, { shouldValidate: true, shouldDirty: true })
            }
            disabled={disabled}
          />
        </div>
      );
    case FieldType.CHECKBOX:
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={fieldId}
            checked={Boolean(value)}
            onCheckedChange={(checked) =>
              form.setValue(field.key, checked, { shouldValidate: true, shouldDirty: true })
            }
            disabled={disabled}
          />
          <Label
            htmlFor={fieldId}
            className="text-xs font-semibold cursor-pointer select-none text-muted-foreground flex items-center gap-1.5"
          >
            {field.icon && <field.icon className="h-3.5 w-3.5 text-muted-foreground/75" />}
            {field.label}
          </Label>
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
          disabled={disabled}
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
          disabled={disabled}
        />
      );
    default:
      return <StandardInput field={field} fieldId={fieldId} form={form} disabled={disabled} />;
  }
}
