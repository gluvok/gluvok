"use client"

/**
 * @file components/combobox/mode.tsx
 * @description Field requirement mode selector combobox component (mandatory, optional, not_required).
 */

import { BaseCombobox } from "./base"
import { FieldRequirementMode } from "@/lib/constants/enums"
import { SlidersHorizontal } from "lucide-react"

interface ModeComboboxProps {
  value: string
  onChange: (value: string) => void
  id?: string
}

const data = [
  { value: FieldRequirementMode.MANDATORY, label: "Mandatory" },
  { value: FieldRequirementMode.OPTIONAL, label: "Optional" },
  { value: FieldRequirementMode.NOT_REQUIRED, label: "Not Required" },
]

/**
 * ModeCombobox Component
 * Renders a dropdown to select field requirement mode (Mandatory, Optional, Not Required).
 */
export function ModeCombobox({ value, onChange, id }: ModeComboboxProps) {
  return (
    <BaseCombobox
      value={value}
      onChange={onChange}
      data={data}
      type="mode"
      icon={SlidersHorizontal}
      placeholder="Select mode..."
      id={id}
    />
  )
}
