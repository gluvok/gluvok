"use client"

/**
 * @file components/combobox/base.tsx
 * @description Standard combobox UI component.
 * Integrates search input, items list, icon overrides (like commodity icons), and custom selection styles.
 */

import React from "react"
import { ChevronsUpDown, Check, LucideIcon } from "lucide-react"
import { Combobox, ComboboxTrigger, ComboboxContent, ComboboxInput, ComboboxList, ComboboxEmpty, ComboboxGroup, ComboboxItem } from "@/components/kibo-ui/combobox"
import { getItemIcon, getModeColorClass } from "@/lib/fields"
import { useCommodityIcon } from "@/hooks/use-commodity-icon"

import { cn } from "@/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
  rightLabel?: string
}

interface BaseComboboxProps {
  value: string
  onChange: (value: string) => void
  data: ComboboxOption[]
  type: string
  icon?: LucideIcon
  iconColorClass?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  id?: string
  className?: string
  contentClassName?: string
  disabled?: boolean
}

/**
 * BaseCombobox Component
 * Multi-purpose searchable dropdown selector, integrating custom icons, labels, and badges.
 */
export function BaseCombobox({
  value,
  onChange,
  data,
  type,
  icon: Icon,
  iconColorClass,
  placeholder,
  searchPlaceholder,
  emptyText,
  id,
  className,
  contentClassName,
  disabled,
}: BaseComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selectedItem = React.useMemo(() => {
    return data.find((item) => String(item.value) === String(value))
  }, [data, value])

  const commodityIcon = useCommodityIcon(type, selectedItem)

  return (
    <Combobox data={data} type={type} value={value} onValueChange={onChange} open={open} onOpenChange={setOpen} modal={true}>
      <ComboboxTrigger
        id={id || `${type}-combobox-trigger`}
        disabled={disabled}
        className={cn(
          "h-9 w-full max-w-full flex items-center justify-between text-xs font-normal border border-input bg-background hover:bg-muted/50 transition-colors min-w-0 shrink overflow-hidden truncate shadow-sm",
          className
        )}
      >
        <span className="flex items-center gap-2 truncate text-left flex-1 min-w-0">
          {commodityIcon ? (
            React.createElement(commodityIcon, { className: "h-3.5 w-3.5 text-muted-foreground shrink-0" })
          ) : Icon ? (
            <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColorClass || "text-muted-foreground")} />
          ) : null}
          <span className="truncate">{selectedItem ? selectedItem.label : placeholder || `Select ${type}...`}</span>
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </ComboboxTrigger>
      <ComboboxContent
        className={cn("max-h-72", contentClassName)}
        popoverOptions={{
          style: { minWidth: "var(--radix-popover-trigger-width)", width: "max-content" },
        }}
      >
        <ComboboxInput
          placeholder={searchPlaceholder || `Search ${type}...`}
          className="h-8 text-xs"
        />
        <ComboboxList className="max-h-64 overflow-y-auto">
          <ComboboxEmpty className="py-2 text-center text-xs text-muted-foreground">{emptyText || `No ${type} found.`}</ComboboxEmpty>
          <ComboboxGroup>
            {data.map((item) => {
              const itemIcon = getItemIcon(type, item.label)
              const isModeType = type === "mode" || type === "modes" || type === "field_requirement_mode"
              const itemIconColor = isModeType
                ? getModeColorClass(item.value)
                : "text-muted-foreground/80"

              return (
                <ComboboxItem
                  key={item.value}
                  id={`${type}-option-${item.value}`}
                  value={`${item.label.toLowerCase()} ${item.value.toLowerCase()} ${item.rightLabel ? item.rightLabel.toLowerCase() : ""}`}
                  onSelect={() => { onChange(item.value); setOpen(false); }}
                  className="text-xs cursor-pointer py-2 hover:bg-muted transition-colors flex items-center justify-between whitespace-nowrap gap-2"
                >
                  <span className="flex items-center gap-2 font-medium text-foreground whitespace-nowrap">
                    {itemIcon && React.createElement(itemIcon, { className: cn("h-3.5 w-3.5 shrink-0", itemIconColor) })}
                    <span className="whitespace-nowrap">{item.label}</span>
                  </span>
                  {item.rightLabel && (
                    <span className="text-xs text-muted-foreground font-semibold bg-muted px-1.5 py-0.5 rounded">{item.rightLabel}</span>
                  )}
                  {String(value) === String(item.value) && !item.rightLabel && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </ComboboxItem>
              )
            })}
          </ComboboxGroup>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
