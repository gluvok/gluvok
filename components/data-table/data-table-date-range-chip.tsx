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
    <Badge
      variant="outline"
      className="shrink-0 gap-1 py-0.5 pl-2 pr-1 text-2xs font-normal border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
    >
      <HugeiconsIcon
        icon={Calendar01Icon}
        className="size-2.5 text-primary shrink-0"
        data-icon="inline-start"
      />
      <span className="text-primary/80">Created:</span>
      <span className="font-medium text-primary">
        {dateRange.to
          ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
          : format(dateRange.from, "LLL dd, y")}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        className="size-4 rounded-full p-0 text-primary/70 hover:bg-primary/20 hover:text-primary"
        aria-label="Remove date range filter"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
      </Button>
    </Badge>
  );
}
