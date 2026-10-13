"use client";

import * as React from "react";
import { type SortingState, type Updater } from "@tanstack/react-table";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { SortableSortChip, SortChipOverlay } from "./sortable-sort-chip";
export interface DataTableCriteriaBarProps {
  hasActiveFilters?: boolean;
  hasActiveSorts?: boolean;
  children?: React.ReactNode;
  sorting?: SortingState;
  onSortingChange?: (updater: Updater<SortingState>) => void;
  onRemoveSort?: (columnId: string) => void;
  columnLabels?: Record<string, string>;
  columnIcons?: Record<string, unknown>;
  onResetAll?: () => void;
}

export function DataTableCriteriaBar({
  hasActiveFilters = false,
  hasActiveSorts = false,
  children,
  sorting = [],
  onSortingChange,
  onRemoveSort,
  columnLabels = {},
  columnIcons = {},
  onResetAll,
}: DataTableCriteriaBarProps) {
  const [activeSortId, setActiveSortId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    setActiveSortId(String(event.active.id));
  }, []);

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveSortId(null);

      if (!over || active.id === over.id || !onSortingChange) return;

      onSortingChange((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    },
    [onSortingChange],
  );

  const handleDragCancel = React.useCallback(() => {
    setActiveSortId(null);
  }, []);

  const activeSortRule = React.useMemo(() => {
    if (!activeSortId) return null;
    return sorting.find((s) => s.id === activeSortId) ?? null;
  }, [activeSortId, sorting]);

  const activeSortIndex = React.useMemo(() => {
    if (!activeSortId) return -1;
    return sorting.findIndex((s) => s.id === activeSortId);
  }, [activeSortId, sorting]);

  const showBar = hasActiveFilters || hasActiveSorts;
  if (!showBar) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto rounded-md bg-muted/30 px-2 py-1 no-scrollbar whitespace-nowrap">
      {/* Filters Section */}
      {hasActiveFilters && (
        <>
          <span className="shrink-0 text-2xs font-medium text-muted-foreground">Filters:</span>
          {children}
        </>
      )}

      {/* Separator between Filters and Sorts */}
      {hasActiveFilters && hasActiveSorts && (
        <span className="mx-0.5 h-3 w-px shrink-0 bg-border/80" aria-hidden="true" />
      )}

      {/* Drag-and-Drop Sort Priority Section */}
      {hasActiveSorts && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <span className="shrink-0 text-2xs font-medium text-muted-foreground">Sorts:</span>
          <SortableContext
            items={sorting.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            {sorting.map((sortRule, index) => {
              const colTitle = columnLabels[sortRule.id] ?? sortRule.id;
              const colIcon = columnIcons[sortRule.id];
              return (
                <SortableSortChip
                  key={sortRule.id}
                  sortRule={sortRule}
                  index={index}
                  colTitle={colTitle}
                  colIcon={colIcon}
                  isDraggable={sorting.length > 1}
                  onRemove={(columnId) => {
                    onRemoveSort?.(columnId);
                  }}
                />
              );
            })}
          </SortableContext>

          <DragOverlay>
            {activeSortRule && activeSortIndex !== -1 ? (
              <SortChipOverlay
                sortRule={activeSortRule}
                index={activeSortIndex}
                colTitle={columnLabels[activeSortRule.id] ?? activeSortRule.id}
                colIcon={columnIcons[activeSortRule.id]}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Clear All Criteria Button */}
      {onResetAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetAll}
          className="shrink-0 ml-auto h-5 px-1.5 text-2xs text-muted-foreground hover:text-foreground"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
