"use client";

/**
 * @file components/combobox/entity.tsx
 * @description Dropdown selector for database entities.
 * Fetches option rows asynchronously and maps them to a selectable combobox list.
 */

import { BaseCombobox } from "./base";
import { useEntityOptions } from "./use-entity-options";

interface EntityComboboxProps {
  entitySlug: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  contextSlug?: string;
  fieldKey?: string;
  disabled?: boolean;
}

/**
 * EntityCombobox Component
 * Custom combobox that loads options for a specific database table (entitySlug)
 * and shows them in a searchable selection menu.
 */
export function EntityCombobox({
  entitySlug,
  value,
  onChange,
  placeholder,
  id,
  contextSlug,
  fieldKey,
  disabled,
}: EntityComboboxProps) {
  const { options, loading } = useEntityOptions(entitySlug, contextSlug, fieldKey, value);

  return (
    <BaseCombobox
      value={value}
      onChange={onChange}
      data={options}
      type={entitySlug}
      placeholder={loading ? `Loading ${entitySlug}...` : placeholder}
      searchPlaceholder={`Search ${entitySlug}...`}
      emptyText={loading ? "Loading..." : `No ${entitySlug} found`}
      id={id}
      disabled={disabled}
      isLoading={loading}
    />
  );
}
