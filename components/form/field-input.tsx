"use client"

/**
 * @file components/form/field-input.tsx
 * @description Dynamic form field input factory selector.
 * Instantiates the correct input component (standard input, combobox, image upload, checkbox)
 * based on field configuration properties.
 */

import { useWatch, type UseFormReturn, type FieldValues } from "react-hook-form"
import { EntityCombobox, RoleCombobox, UnitCombobox, TypeCombobox, ModeCombobox } from "@/components/combobox"
import { FieldType } from "@/lib/constants/enums"
import { type FieldConfig, getReferencedEntitySlug } from "@/lib/fields"
import { Checkbox } from "@/components/ui/checkbox"
import { StandardInput } from "./standard-input"
import { ImageUpload } from "./image/upload"

interface FormFieldInputProps {
  field: FieldConfig
  form: UseFormReturn<FieldValues>
  idPrefix: string
  disabled?: boolean
  projectSlug?: string
}

/**
 * FormFieldInput Component
 * Evaluates field.type and returns the designated component. Integrates with react-hook-form control state.
 */
export function FormFieldInput({ field, form, idPrefix, disabled, projectSlug }: FormFieldInputProps) {
  const referencedSlug = getReferencedEntitySlug(field.key)
  const fieldId = `${idPrefix}-field-${field.key}`
  const value = useWatch({ control: form.control, name: field.key })

  switch (field.type) {
    case FieldType.IMAGES:
      return (
        <ImageUpload
          id={fieldId}
          value={Array.isArray(value) ? value : []}
          onChange={(newImages) => form.setValue(field.key, newImages, { shouldValidate: true })}
          disabled={disabled}
        />
      )
    case FieldType.CHECKBOX:
      const { ref: checkboxRef } = form.register(field.key)
      return (
        <Checkbox
          id={fieldId}
          checked={value === true || value === "true"}
          onCheckedChange={(checked) => form.setValue(field.key, !!checked, { shouldValidate: true })}
          disabled={disabled}
          ref={checkboxRef}
        />
      )

    case FieldType.ROLE:
      return (
        <RoleCombobox
          id={`${idPrefix}-role-trigger`}
          value={typeof value === "string" ? value : ""}
          onChange={(val) => form.setValue(field.key, val, { shouldValidate: true })}
          disabled={disabled}
        />
      )
    case FieldType.UNIT:
      return (
        <UnitCombobox
          id={`${idPrefix}-unit-trigger`}
          value={typeof value === "string" ? value : ""}
          onChange={(val) => form.setValue(field.key, val, { shouldValidate: true })}
        />
      )
    case FieldType.TYPE:
      return (
        <TypeCombobox
          id={`${idPrefix}-type-trigger`}
          value={typeof value === "string" ? value : ""}
          onChange={(val) => form.setValue(field.key, val, { shouldValidate: true })}
        />
      )
    case FieldType.FIELD_REQUIREMENT_MODE:
      return (
        <ModeCombobox
          id={`${idPrefix}-mode-trigger-${field.key}`}
          value={typeof value === "string" ? value : ""}
          onChange={(val) => form.setValue(field.key, val, { shouldValidate: true })}
        />
      )
    default:
      if (referencedSlug) {
        return (
          <EntityCombobox
            id={fieldId}
            entitySlug={referencedSlug}
            value={typeof value === "string" ? value : ""}
            onChange={(val) => form.setValue(field.key, val, { shouldValidate: true })}
            placeholder={field.placeholder}
            contextSlug={projectSlug}
            fieldKey={field.key}
          />
        )
      }
      return (
        <StandardInput
          field={field}
          form={form}
          fieldId={fieldId}
          disabled={disabled}
        />
      )
  }
}
