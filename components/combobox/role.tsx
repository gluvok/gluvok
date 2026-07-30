"use client"

/**
 * @file components/combobox/role.tsx
 * @description Combobox selector specifically built for selecting user roles.
 */

import { BaseCombobox } from "./base"
import { Role, RoleLabel } from "@/lib/constants/enums"
import { getRoleIcon } from "@/lib/fields/helpers"

interface RoleComboboxProps {
  value: string
  onChange: (value: string) => void
  id?: string
  disabled?: boolean
}

export function RoleCombobox({ value, onChange, id, disabled }: RoleComboboxProps) {
  const data = [
    { value: Role.ADMIN, label: RoleLabel.ADMIN },
    { value: Role.MANAGER, label: RoleLabel.MANAGER },
    { value: Role.OPERATOR, label: RoleLabel.OPERATOR },
    { value: Role.BASE, label: RoleLabel.BASE },
  ]

  const ActiveIcon = getRoleIcon(value)

  return (
    <BaseCombobox
      value={value}
      onChange={onChange}
      data={data}
      type="role"
      icon={ActiveIcon}
      placeholder="Select role..."
      id={id}
      disabled={disabled}
    />
  )
}
