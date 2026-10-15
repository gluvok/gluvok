import * as React from "react";
import type { ColumnSort } from "@tanstack/react-table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  DragDropVerticalIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface SortableSortChipProps {
  sortRule: ColumnSort;
  index: number;
  colTitle: string;
  colIcon?: unknown;
  isDraggable: boolean;
  onRemove: (columnId: string) => void;
}

export function SortableSortChip({
  sortRule,
  index,
  colTitle,
  colIcon,
  isDraggable,
  onRemove,
}: SortableSortChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortRule.id,
    disabled: !isDraggable,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <Badge
      ref={setNodeRef}
      style={style}
      variant="outline"
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
      className={cn(
        "h-6 inline-flex items-center shrink-0 gap-1 rounded-full border border-primary/35 bg-primary/10 pl-1.5 pr-1 text-2xs font-normal text-foreground select-none transition-transform duration-200 ease-out hover:bg-primary/15",
        isDraggable && "cursor-grab active:cursor-grabbing touch-none",
        isDragging && "opacity-30 border-dashed border-primary/40",
      )}
    >
      {isDraggable && (
        <HugeiconsIcon icon={DragDropVerticalIcon} className="size-3 text-primary/70 shrink-0" />
      )}
      <span className="size-3.5 shrink-0 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center text-3xs shadow-2xs select-none">
        {index + 1}
      </span>
      {colIcon ? (
        <HugeiconsIcon
          icon={colIcon as Parameters<typeof HugeiconsIcon>[0]["icon"]}
          className="size-2.5 text-primary shrink-0"
          data-icon="inline-start"
        />
      ) : null}
      <span className="text-muted-foreground">{colTitle}:</span>
      <HugeiconsIcon
        icon={sortRule.desc ? ArrowDown01Icon : ArrowUp01Icon}
        className="size-2.5 text-primary shrink-0"
      />
      <span className="font-medium text-foreground">{sortRule.desc ? "Desc" : "Asc"}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={() => onRemove(sortRule.id)}
        className="size-3.5 rounded-full p-0 text-primary/70 hover:bg-primary/20 hover:text-primary"
        aria-label={`Remove ${colTitle} sort`}
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-2.5" />
      </Button>
    </Badge>
  );
}

// Elevated overlay preview rendered during drag
export function SortChipOverlay({
  sortRule,
  index,
  colTitle,
  colIcon,
}: {
  sortRule: ColumnSort;
  index: number;
  colTitle: string;
  colIcon?: unknown;
}) {
  return (
    <Badge
      variant="secondary"
      className="h-6 inline-flex items-center shrink-0 gap-1 rounded-full border border-primary/50 bg-card/95 pl-1.5 pr-1 text-2xs font-normal text-foreground select-none cursor-grabbing shadow-md scale-105 touch-none"
    >
      <HugeiconsIcon icon={DragDropVerticalIcon} className="size-3 text-primary/80 shrink-0" />
      <span className="size-3.5 shrink-0 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center text-3xs shadow-2xs select-none">
        {index + 1}
      </span>
      {colIcon ? (
        <HugeiconsIcon
          icon={colIcon as Parameters<typeof HugeiconsIcon>[0]["icon"]}
          className="size-2.5 text-primary shrink-0"
          data-icon="inline-start"
        />
      ) : null}
      <span className="text-muted-foreground">{colTitle}:</span>
      <HugeiconsIcon
        icon={sortRule.desc ? ArrowDown01Icon : ArrowUp01Icon}
        className="size-2.5 text-primary shrink-0"
      />
      <span className="font-medium">{sortRule.desc ? "Desc" : "Asc"}</span>
    </Badge>
  );
}
