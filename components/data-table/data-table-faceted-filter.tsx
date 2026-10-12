"use client";

import * as React from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

export interface FacetedFilterOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface DataTableFacetedFilterProps {
  title: string;
  options: FacetedFilterOption[];
  value: string;
  onValueChange: (value: string) => void;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

export function DataTableFacetedFilter({
  title,
  options,
  value,
  onValueChange,
  defaultValue = "all",
  placeholder,
  className,
}: DataTableFacetedFilterProps) {
  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === value) ?? options[0];
  }, [options, value]);

  const isFiltered = value !== defaultValue;

  return (
    <div className={cn("w-full sm:w-48", className)}>
      <Combobox
        items={options}
        value={selectedOption}
        onValueChange={(val: FacetedFilterOption | null) => {
          onValueChange(val ? val.value : defaultValue);
        }}
        itemToStringValue={(item: FacetedFilterOption) => item.label}
      >
        <ComboboxInput
          placeholder={placeholder ?? `${title} filter`}
          className="h-8 w-full text-2xs"
          showClear={isFiltered}
        />
        <ComboboxContent>
          <ComboboxEmpty className="text-xs">No options found.</ComboboxEmpty>
          <ComboboxList>
            {options.map((item) => {
              const Icon = item.icon;
              return (
                <ComboboxItem key={item.value} value={item} className="text-xs">
                  {Icon && <Icon className="mr-1.5 size-3.5 text-muted-foreground" />}
                  <span>{item.label}</span>
                </ComboboxItem>
              );
            })}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
