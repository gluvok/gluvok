"use client"

/**
 * @file components/combobox/type.tsx
 * @description Weighment type selector combobox component (in, out).
 */

import { BaseCombobox } from "./base"
import { WeighmentType } from "@/lib/constants/enums"
import { getTypeIcon } from "@/lib/fields/helpers"

interface TypeComboboxProps {
  value: string
  onChange: (value: string) => void
  id?: string
}

const data = [
  { value: WeighmentType.IN, label: "In" },
  { value: WeighmentType.OUT, label: "Out" },
  { value: WeighmentType.UNASSIGNED, label: "Unassigned" },
]

/**
 * TypeCombobox Component
 * Renders a dropdown to select a weighment transaction type (incoming vs outgoing).
 */
export function TypeCombobox({ value, onChange, id }: TypeComboboxProps) {
  const ActiveIcon = getTypeIcon(value)

  return (
    <BaseCombobox
      value={value}
      onChange={onChange}
      data={data}
      type="type"
      icon={ActiveIcon}
      placeholder="Select type..."
      id={id}
    />
  )
}
