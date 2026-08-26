"use client";

/**
 * @file components/combobox/role.tsx
 * @description Combobox selector specifically built for selecting user roles.
 */

import { BaseCombobox } from "./base";
import { Role } from "@/lib/constants/enums";
import { getRoleIcon } from "@/lib/fields/helpers";

interface RoleComboboxProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

export function RoleCombobox({ value, onChange, id, disabled }: RoleComboboxProps) {
  const data = [
    { value: Role.ADMIN, label: Role.ADMIN },
    { value: Role.MANAGER, label: Role.MANAGER },
    { value: Role.OPERATOR, label: Role.OPERATOR },
    { value: Role.BASE, label: Role.BASE },
  ];

  const ActiveIcon = getRoleIcon(value);

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
  );
}
