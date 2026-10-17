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

export interface FacetedFilterOption {
  label: string;
  value: string;
  icon?: ComponentProps<typeof HugeiconsIcon>["icon"];
  idPrefix?: string;
}

export interface DataTableFacetedFilterProps {
  title: string;
  options: FacetedFilterOption[];
  value: string;
  onValueChange: (value: string) => void;
}

export function DataTableFacetedFilter({
  title,
  options,
  value,
  onValueChange,
}: DataTableFacetedFilterProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === value) ?? options[0];
  }, [options, value]);

  const getOptionIcon = React.useCallback((opt?: FacetedFilterOption) => {
    if (!opt) return;
    if (opt.icon) return opt.icon;
    if (opt.value === "all") return appIcons.allFilter;

    return;
  }, []);

  const selectedIcon = getOptionIcon(selectedOption);

  return (
    <div className="w-full sm:w-44">
      <Combobox
        data={options}
        open={open}
        onOpenChange={setOpen}
        value={value}
        onValueChange={(val) => {
          onValueChange(val || "all");
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
            {selectedOption?.idPrefix && (
              <span className="shrink-0 text-muted-foreground">{selectedOption.idPrefix}</span>
            )}
            <span className="truncate">{selectedOption?.label ?? `Select ${title}...`}</span>
          </span>
          <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </ComboboxTrigger>
        <ComboboxContent
          className="min-w-52"
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
                    keywords={[item.label, item.idPrefix ?? ""]}
                    className="text-xs whitespace-nowrap"
                  >
                    {icon && (
                      <HugeiconsIcon
                        icon={icon}
                        className="mr-1.5 size-3.5 text-muted-foreground"
                      />
                    )}
                    {item.idPrefix && (
                      <span className="mr-1.5 text-muted-foreground">{item.idPrefix}</span>
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
