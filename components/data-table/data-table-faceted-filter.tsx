"use client";

import * as React from "react";
import type { ComponentProps } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/kibo-ui/combobox";
import { ChevronsUpDownIcon } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { appIcons } from "@/lib/icons";
import { cn } from "@/lib/utils";

export interface FacetedFilterOption {
  label: string;
  value: string;
  icon?: ComponentProps<typeof HugeiconsIcon>["icon"];
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
  const [open, setOpen] = React.useState(false);

  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === value) ?? options[0];
  }, [options, value]);

  const getOptionIcon = React.useCallback(
    (opt?: FacetedFilterOption) => {
      if (!opt) return undefined;
      if (opt.icon) return opt.icon;
      if (opt.value === defaultValue || opt.value === "all") {
        return appIcons.allFilter;
      }
      return undefined;
    },
    [defaultValue],
  );

  const selectedIcon = getOptionIcon(selectedOption);

  return (
    <div className={cn("w-full sm:w-44", className)}>
      <Combobox
        data={options}
        open={open}
        onOpenChange={setOpen}
        value={value}
        onValueChange={(val) => {
          onValueChange(val || defaultValue);
        }}
        type={title.toLowerCase()}
      >
        <ComboboxTrigger className="h-8 w-full justify-between border-input bg-input/20 px-2.5 text-2xs font-normal hover:bg-accent/50 dark:bg-input/30">
          <span className="flex items-center gap-1.5 truncate">
            {selectedIcon && (
              <HugeiconsIcon
                icon={selectedIcon}
                className="size-3.5 shrink-0 text-muted-foreground"
              />
            )}
            <span className="truncate">
              {selectedOption?.label ?? placeholder ?? `Select ${title}...`}
            </span>
          </span>
          <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </ComboboxTrigger>
        <ComboboxContent
          className="min-w-48"
          popoverOptions={{
            align: "start",
            sideOffset: 6,
          }}
        >
          <ComboboxInput placeholder={`Search ${title.toLowerCase()}...`} />
          <ComboboxEmpty className="py-2 text-center text-xs text-muted-foreground">
            No options found.
          </ComboboxEmpty>
          <ComboboxList>
            <ComboboxGroup>
              {options.map((item) => {
                const icon = getOptionIcon(item);
                return (
                  <ComboboxItem
                    key={item.value}
                    value={item.value}
                    className="text-xs whitespace-nowrap"
                  >
                    {icon && (
                      <HugeiconsIcon
                        icon={icon}
                        className="mr-1.5 size-3.5 text-muted-foreground"
                      />
                    )}
                    <span>{item.label}</span>
                  </ComboboxItem>
                );
              })}
            </ComboboxGroup>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
