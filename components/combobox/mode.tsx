"use client"

/**
 * @file components/combobox/mode.tsx
 * @description Field requirement mode selector combobox component (mandatory, optional, not_required).
 * Each mode option renders with a distinct icon for quick visual identification.
 */

import { BaseCombobox } from "./base"
import { FieldRequirementMode } from "@/lib/constants/enums"
import { getModeIcon } from "@/lib/fields"

interface ModeComboboxProps {
  value: string
  onChange: (value: string) => void
  id?: string
}

const MODE_OPTIONS = [
  { value: FieldRequirementMode.MANDATORY, label: "Mandatory" },
  { value: FieldRequirementMode.OPTIONAL, label: "Optional" },
  { value: FieldRequirementMode.NOT_REQUIRED, label: "Not Required" },
]

/**
 * ModeCombobox Component
 * Renders a dropdown to select field requirement mode (Mandatory, Optional, Not Required).
 * Each option shows a contextual icon: CheckCircle2, HelpCircle, or Ban.
 */
export function ModeCombobox({ value, onChange, id }: ModeComboboxProps) {
  const selectedIcon = getModeIcon(value)

  return (
    <BaseCombobox
      value={value}
      onChange={onChange}
      data={MODE_OPTIONS}
      type="mode"
      icon={selectedIcon}
      placeholder="Select mode..."
      id={id}
    />
  )
}
