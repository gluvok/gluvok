import * as React from "react";
import type { ColumnSort } from "@tanstack/react-table";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, DragDropVerticalIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface SortableSortChipProps {
  sortRule: ColumnSort;
  index: number;
  colTitle: string;
  isDraggable: boolean;
  onRemove: (columnId: string) => void;
}

export function SortableSortChip({
  sortRule,
  index,
  colTitle,
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
      variant="secondary"
      {...(isDraggable ? { ...attributes, ...listeners } : {})}
      className={cn(
        "shrink-0 gap-1 py-0.5 pl-1.5 pr-1 text-2xs font-normal select-none transition-transform duration-200 ease-out",
        isDraggable && "cursor-grab active:cursor-grabbing touch-none",
        isDragging && "opacity-30 border-dashed border-primary/40",
      )}
    >
      {isDraggable && (
        <HugeiconsIcon
          icon={DragDropVerticalIcon}
          className="size-3 text-muted-foreground/60 shrink-0"
        />
      )}
      <span className="font-semibold text-primary">#{index + 1}</span>
      <span className="text-muted-foreground">{colTitle}:</span>
      <span className="font-medium">{sortRule.desc ? "Desc" : "Asc"}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={() => onRemove(sortRule.id)}
        className="size-4 rounded-full p-0 text-muted-foreground hover:bg-muted-foreground/20 hover:text-foreground"
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
}: {
  sortRule: ColumnSort;
  index: number;
  colTitle: string;
}) {
  return (
    <Badge
      variant="secondary"
      className="shrink-0 gap-1 py-0.5 pl-1.5 pr-1 text-2xs font-normal select-none cursor-grabbing shadow-md scale-105 bg-card/95 border border-primary/50 touch-none"
    >
      <HugeiconsIcon
        icon={DragDropVerticalIcon}
        className="size-3 text-muted-foreground/80 shrink-0"
      />
      <span className="font-semibold text-primary">#{index + 1}</span>
      <span className="text-muted-foreground">{colTitle}:</span>
      <span className="font-medium">{sortRule.desc ? "Desc" : "Asc"}</span>
    </Badge>
  );
}
