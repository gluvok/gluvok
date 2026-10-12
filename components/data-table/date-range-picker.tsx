"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DatePickerWithRangeProps {
  date?: DateRange | undefined;
  onDateChange?: (date: DateRange | undefined) => void;
  className?: string;
  label?: string;
}

export function DatePickerWithRange({
  date: controlledDate,
  onDateChange,
  className,
  label = "Date Picker Range",
}: DatePickerWithRangeProps = {}) {
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 20),
    to: addDays(new Date(new Date().getFullYear(), 0, 20), 20),
  });

  const isControlled = onDateChange !== undefined;
  const date = isControlled ? controlledDate : internalDate;

  const handleSelect = (selected: DateRange | undefined) => {
    if (!isControlled) {
      setInternalDate(selected);
    }
    onDateChange?.(selected);
  };

  return (
    <Field className={cn("w-60", className)}>
      <FieldLabel htmlFor="date-picker-range" className="text-xs font-medium text-muted-foreground">
        {label}
      </FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              id="date-picker-range"
              className={cn(
                "h-8 justify-start px-2.5 text-xs font-normal",
                !date?.from && "text-muted-foreground",
              )}
            >
              <HugeiconsIcon icon={Calendar01Icon} data-icon="inline-start" className="size-3.5" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
          {date?.from && (
            <div className="flex items-center justify-end border-t border-border p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelect(undefined)}
                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                <span>Clear date filter</span>
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </Field>
  );
}

export { DatePickerWithRange as DateRangePicker };
