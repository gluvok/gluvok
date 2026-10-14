"use client";

import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

interface DataTableDateRangeChipProps {
  dateRange?: DateRange;
  onRemove: () => void;
}

export function DataTableDateRangeChip({ dateRange, onRemove }: DataTableDateRangeChipProps) {
  if (!dateRange?.from) return null;

  return (
    <Badge variant="secondary" className="shrink-0 gap-1 py-0.5 pl-2 pr-1 text-2xs font-normal">
      <HugeiconsIcon
        icon={Calendar01Icon}
        className="size-2.5 text-muted-foreground shrink-0"
        data-icon="inline-start"
      />
      <span className="text-muted-foreground">Created:</span>
      <span className="font-medium">
        {dateRange.to
          ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
          : format(dateRange.from, "LLL dd, y")}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        className="size-4 rounded-full p-0 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
        aria-label="Remove date range filter"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
      </Button>
    </Badge>
  );
}
