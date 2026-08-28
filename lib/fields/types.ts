/**
 * @file lib/fields/types.ts
 * @description Helper definitions or configuration for entity table fields (types).
 */

import { ComponentType, HTMLAttributes } from "react";
import { FieldType, Role, FieldSpan } from "@/lib/constants/enums";

export { FieldSpan };

export interface FieldConfig {
  key: string;
  label: string;
  placeholder: string;
  type: FieldType;
  required?: boolean;
  createOnly?: boolean;
  /** When true, this field always starts a new layout row, breaking out of the current group. */
  newRow?: boolean;
  className?: string;
  transformOnChange?: (value: string) => string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  icon?: ComponentType<{ className?: string }>;
  visibleRoles?: Role[];
  editVisibleRoles?: Role[];
  editableRoles?: Role[];
  requiresEditPermission?: boolean;
  halfWidth?: boolean;
  span?: FieldSpan;
}
