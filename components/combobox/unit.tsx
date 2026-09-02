"use client";

/**
 * @file components/combobox/unit.tsx
 * @description Unit selector combobox component (kg, quintals, gallons).
 */

import { BaseCombobox } from "./base";
import { Unit } from "@/lib/constants/enums";
import { getUnitColorClass, getUnitIcon } from "@/lib/fields/helpers";

interface UnitComboboxProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

const data = [
  { value: Unit.KG, label: Unit.KG },
  { value: Unit.Q, label: Unit.Q },
  { value: Unit.GAL, label: Unit.GAL },
];

/**
 * UnitCombobox Component
 * Renders a dropdown to select a unit of measurement.
 */
export function UnitCombobox({ value, onChange, id, disabled }: UnitComboboxProps) {
  const ActiveIcon = getUnitIcon(value);

  return (
    <BaseCombobox
      value={value}
      onChange={onChange}
      data={data}
      type="unit"
      icon={ActiveIcon}
      iconColorClass={getUnitColorClass(value)}
      placeholder="Select unit..."
      id={id}
      disabled={disabled}
    />
  );
}
