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
  categoryIcon?: unknown;
  valueIcon?: unknown;
  icon?: unknown;
  variant?: FilterChipVariant;
  onRemove: () => void;
}

const VARIANT_STYLES: Record<
  FilterChipVariant,
  {
    container: string;
    icon: string;
    label: string;
    value: string;
    dismiss: string;
  }
> = {
  stone: {
    container:
      "border-stone-300/80 bg-stone-500/10 text-stone-800 dark:border-stone-700/80 dark:bg-stone-900/30 dark:text-stone-200",
    icon: "text-stone-600 dark:text-stone-400",
    label: "text-stone-600 dark:text-stone-400",
    value: "text-stone-950 dark:text-stone-100",
    dismiss: "text-stone-500 hover:bg-stone-500/20 hover:text-stone-900 dark:hover:text-stone-100",
  },
  emerald: {
    container:
      "border-emerald-300/80 bg-emerald-600/10 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200",
    icon: "text-emerald-600 dark:text-emerald-400",
    label: "text-emerald-700 dark:text-emerald-300",
    value: "text-emerald-950 dark:text-emerald-100",
    dismiss:
      "text-emerald-600 hover:bg-emerald-600/20 hover:text-emerald-900 dark:hover:text-emerald-100",
  },
  orange: {
    container:
      "border-orange-300/80 bg-orange-600/10 text-orange-900 dark:border-orange-800/50 dark:bg-orange-950/30 dark:text-orange-200",
    icon: "text-orange-600 dark:text-orange-400",
    label: "text-orange-700 dark:text-orange-300",
    value: "text-orange-950 dark:text-orange-100",
    dismiss:
      "text-orange-600 hover:bg-orange-600/20 hover:text-orange-900 dark:hover:text-orange-100",
  },
  amber: {
    container:
      "border-amber-300/80 bg-amber-600/10 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200",
    icon: "text-amber-600 dark:text-amber-400",
    label: "text-amber-700 dark:text-amber-300",
    value: "text-amber-950 dark:text-amber-100",
    dismiss: "text-amber-600 hover:bg-amber-600/20 hover:text-amber-900 dark:hover:text-amber-100",
  },
  primary: {
    container:
      "border-primary/30 bg-primary/10 text-primary dark:border-primary/40 dark:bg-primary/15 dark:text-primary",
    icon: "text-primary",
    label: "text-primary/80",
    value: "text-primary",
    dismiss: "text-primary/70 hover:bg-primary/20 hover:text-primary",
  },
  zinc: {
    container:
      "border-zinc-300 bg-zinc-600/10 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-100",
    icon: "text-zinc-600 dark:text-zinc-400",
    label: "text-zinc-600 dark:text-zinc-400",
    value: "text-zinc-950 dark:text-zinc-100",
    dismiss: "text-zinc-500 hover:bg-zinc-500/20 hover:text-zinc-900 dark:hover:text-zinc-100",
  },
};

export function DataTableFilterChip({
  label,
  value,
  categoryIcon,
  valueIcon,
  icon,
  variant = "stone",
  onRemove,
}: DataTableFilterChipProps) {
  const styles = VARIANT_STYLES[variant];
  const catIcon = categoryIcon ?? icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 inline-flex items-center shrink-0 gap-1 rounded-md px-1.5 text-2xs font-normal shadow-2xs select-none",
        styles.container,
      )}
    >
      {catIcon ? (
        <HugeiconsIcon
          icon={catIcon as Parameters<typeof HugeiconsIcon>[0]["icon"]}
          className={cn("size-2.5 shrink-0", styles.icon)}
          data-icon="inline-start"
        />
      ) : null}
      <span className={styles.label}>{label}:</span>
      {valueIcon ? (
        <HugeiconsIcon
          icon={valueIcon as Parameters<typeof HugeiconsIcon>[0]["icon"]}
          className={cn("size-2.5 shrink-0", styles.icon)}
          data-icon="inline-start"
        />
      ) : null}
      <span className={cn("font-medium", styles.value)}>{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        className={cn("size-3 rounded p-0", styles.dismiss)}
        aria-label={`Remove ${label} filter`}
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-2" />
      </Button>
    </Badge>
  );
}
