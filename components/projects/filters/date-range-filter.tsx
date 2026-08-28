"use client";

/**
 * @file components/projects/filters/date-range-filter.tsx
 * @description Reusable Date Range filter component with quick presets (Today, Yesterday, Last 7 Days, This Month) and disabled future dates.
 */

import * as React from "react";
import { format, subDays, startOfMonth, startOfDay, endOfDay } from "date-fns";
import { type DateRange } from "react-day-picker";
import { type ReactTable, type RowData } from "@tanstack/react-table";
import { type ProjectTableFeatures } from "@/components/data-table/features";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X, Zap, CalendarCheck } from "lucide-react";
import { DatePreset } from "@/lib/constants/enums";

interface DateRangeFilterProps<TData extends RowData> {
  table: ReactTable<ProjectTableFeatures, TData>;
  startKey?: string;
  endKey?: string;
  className?: string;
}

const DISPLAY_DATE_FORMAT = "LLL dd, y";

const PRESET_OPTIONS: { id: DatePreset; label: string }[] = [
  { id: DatePreset.TODAY, label: "Today" },
  { id: DatePreset.YESTERDAY, label: "Yesterday" },
  { id: DatePreset.LAST_2_DAYS, label: "Last 2 Days" },
  { id: DatePreset.LAST_7_DAYS, label: "Last 7 Days" },
  { id: DatePreset.THIS_MONTH, label: "This Month" },
];

export function DateRangeFilter<TData extends RowData>({
  table,
  startKey = "start_date",
  endKey = "end_date",
  className = "w-auto",
}: DateRangeFilterProps<TData>) {
  const columnFilters = table.state.columnFilters;
  const currentStartDateVal = columnFilters.find((f) => f.id === startKey)?.value as
    | string
    | undefined;
  const currentEndDateVal = columnFilters.find((f) => f.id === endKey)?.value as string | undefined;

  const dateRange: DateRange | undefined = React.useMemo(() => {
    const from = currentStartDateVal ? new Date(currentStartDateVal) : undefined;
    const to = currentEndDateVal ? new Date(currentEndDateVal) : undefined;
    if (!from && !to) return undefined;
    return { from, to };
  }, [currentStartDateVal, currentEndDateVal]);

  const [open, setOpen] = React.useState(false);

  const applyRange = (range: DateRange | undefined) => {
    table.setColumnFilters((prev) => {
      const filtered = prev.filter((f) => f.id !== startKey && f.id !== endKey);
      if (range?.from) {
        filtered.push({ id: startKey, value: startOfDay(range.from).toISOString() });
      }
      if (range?.to) {
        filtered.push({ id: endKey, value: endOfDay(range.to).toISOString() });
      }
      return filtered;
    });
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    applyRange(undefined);
  };

  const handlePresetSelect = (preset: DatePreset) => {
    const now = new Date();

    switch (preset) {
      case DatePreset.TODAY:
        return applyRange({ from: now, to: now });
      case DatePreset.YESTERDAY: {
        const yest = subDays(now, 1);
        return applyRange({ from: yest, to: yest });
      }
      case DatePreset.LAST_2_DAYS:
        return applyRange({ from: subDays(now, 1), to: now });
      case DatePreset.LAST_7_DAYS:
        return applyRange({ from: subDays(now, 6), to: now });
      case DatePreset.THIS_MONTH:
        return applyRange({ from: startOfMonth(now), to: now });
    }
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative inline-flex items-center w-full">
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker-range"
              aria-label="Filter by Date Range"
              className={`h-9 text-xs justify-between font-normal bg-background shadow-sm px-2.5 w-full ${dateRange?.from ? "pr-8" : ""}`}
            >
              <span className="flex items-center truncate">
                <CalendarIcon className="mr-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, DISPLAY_DATE_FORMAT)} -{" "}
                      {format(dateRange.to, DISPLAY_DATE_FORMAT)}
                    </>
                  ) : (
                    format(dateRange.from, DISPLAY_DATE_FORMAT)
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </span>
            </Button>
          </PopoverTrigger>
          {dateRange?.from && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="h-5 w-5 absolute right-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors"
              title="Clear date filter"
              aria-label="Clear date filter"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <PopoverContent className="w-auto p-0 flex flex-col" align="start">
          {/* Quick Presets Bar */}
          <div className="flex items-center gap-1.5 p-2 border-b border-border bg-muted/20 flex-wrap">
            <span className="text-2xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Presets:
            </span>
            {PRESET_OPTIONS.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                onClick={() => handlePresetSelect(preset.id)}
                className="h-5 text-2xs px-1.5 py-0 font-medium hover:bg-accent"
                id={`preset-${preset.id}`}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <Calendar
            mode="range"
            captionLayout="dropdown"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={applyRange}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
            endMonth={new Date()}
          />
          {dateRange?.from && (
            <div className="flex items-center justify-between border-t border-border px-3 py-1.5 bg-muted/30 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyRange({ from: dateRange.from!, to: new Date() })}
                className="h-6 text-2xs px-2.5 font-medium bg-background hover:bg-accent text-primary border-primary/30 gap-1.5 shadow-2xs transition-all hover:border-primary/50"
                id="set-end-to-today"
              >
                <CalendarCheck data-icon="inline-start" />
                Select Today as End Date
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleClear();
                  setOpen(false);
                }}
                className="h-6 text-xs px-2 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
