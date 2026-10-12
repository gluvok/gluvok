"use client";

import type { HTMLAttributes } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangePickerProps extends HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  onDateChange: (range: DateRange | undefined) => void;
}

export function DateRangePicker({ date, onDateChange, className }: DateRangePickerProps) {
  const hasRange = date?.from !== undefined;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 justify-start gap-1.5 px-2.5 text-left text-xs font-normal",
                !date?.from && "text-muted-foreground",
              )}
            >
              <HugeiconsIcon
                icon={Calendar01Icon}
                data-icon="inline-start"
                className="size-3.5 text-muted-foreground"
              />
              <span>
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  "Filter by created date..."
                )}
              </span>
            </Button>
          }
        />
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={1}
            className="rounded-md border-0 p-2"
          />
          {hasRange && (
            <div className="flex items-center justify-end border-t border-border p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDateChange(undefined)}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear date filter
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {hasRange && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDateChange(undefined)}
          className="size-8 p-0 text-muted-foreground hover:text-foreground"
          title="Clear date filter"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
          <span className="sr-only">Clear date</span>
        </Button>
      )}
    </div>
  );
}
