/**
 * @file lib/fields/types.ts
 * @description Helper definitions or configuration for entity table fields (types).
 */

import { ComponentType } from "react"
import { EntityKey, FieldType, InputMode, Role, FieldSpan } from "@/lib/constants/enums"

export { FieldSpan }

export interface FieldConfig {
  key: EntityKey
  label: string
  placeholder: string
  type: FieldType
  required?: boolean
  createOnly?: boolean
  className?: string
  transformOnChange?: (value: string) => string
  inputMode?: InputMode
  icon?: ComponentType<{ className?: string }>
  visibleRoles?: Role[]
  editVisibleRoles?: Role[]
  editableRoles?: Role[]
  halfWidth?: boolean
  span?: FieldSpan
}
