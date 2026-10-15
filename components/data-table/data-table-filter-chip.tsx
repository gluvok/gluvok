"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

interface DataTableFilterChipProps {
  label: string;
  value: string;
  icon?: unknown;
  onRemove: () => void;
}

export function DataTableFilterChip({ label, value, icon, onRemove }: DataTableFilterChipProps) {
  return (
    <Badge
      variant="outline"
      className="shrink-0 gap-1.5 rounded-md border-border/80 bg-background/95 py-0.5 pl-2 pr-1 text-2xs font-normal text-foreground shadow-2xs select-none"
    >
      {icon ? (
        <HugeiconsIcon
          icon={icon as Parameters<typeof HugeiconsIcon>[0]["icon"]}
          className="size-3 text-muted-foreground shrink-0"
          data-icon="inline-start"
        />
      ) : null}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        className="size-3.5 rounded p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Remove ${label} filter`}
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
      </Button>
    </Badge>
  );
}
