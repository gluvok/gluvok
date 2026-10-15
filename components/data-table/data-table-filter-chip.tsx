"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export type FilterChipVariant = "stone" | "emerald" | "orange" | "amber" | "primary" | "zinc";

interface DataTableFilterChipProps {
  label: string;
  value: string;
  icon?: unknown;
  variant?: FilterChipVariant;
  onRemove: () => void;
}

const VARIANT_STYLES: Record<
  FilterChipVariant,
  {
    icon: string;
  }
> = {
  stone: {
    icon: "text-stone-600 dark:text-stone-400",
  },
  emerald: {
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  orange: {
    icon: "text-orange-600 dark:text-orange-400",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-400",
  },
  primary: {
    icon: "text-primary",
  },
  zinc: {
    icon: "text-zinc-600 dark:text-zinc-400",
  },
};

export function DataTableFilterChip({
  label,
  value,
  icon,
  variant = "stone",
  onRemove,
}: DataTableFilterChipProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <Badge
      variant="outline"
      className="h-6 inline-flex items-center shrink-0 gap-1.5 rounded-md border-stone-300/80 bg-stone-500/5 hover:bg-stone-500/10 text-stone-800 dark:border-stone-700/80 dark:bg-stone-900/30 dark:text-stone-200 pl-2 pr-1 text-2xs font-normal shadow-2xs select-none"
    >
      {icon ? (
        <HugeiconsIcon
          icon={icon as Parameters<typeof HugeiconsIcon>[0]["icon"]}
          className={cn("size-3 shrink-0", styles.icon)}
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
        className="size-3.5 rounded p-0 text-muted-foreground hover:bg-stone-500/20 hover:text-foreground"
        aria-label={`Remove ${label} filter`}
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
      </Button>
    </Badge>
  );
}
