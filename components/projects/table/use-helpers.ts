"use client";

/**
 * @file components/projects/table/use-helpers.ts
 * @description Hook to manage dialog/overlay open states for editing, deleting, and creating entities.
 */

import * as React from "react";
import { type EntityRecord } from "@/types";
import { type ColumnFiltersState, type Table } from "@tanstack/react-table";

/**
 * useProjectDialogStates hook
 * Manages open states and references to active entities for edit, delete, and create dialog overlays.
 * Handlers are memoized via React.useCallback for referential stability in table columns.
 */
export function useProjectDialogStates() {
  const [editingItem, setEditingItemState] = React.useState<EntityRecord | null>(null);
  const [deletingItem, setDeletingItemState] = React.useState<EntityRecord | null>(null);
  const [creating, setCreatingState] = React.useState(false);

  const setEditingItem = React.useCallback((item: EntityRecord | null) => {
    setEditingItemState(item);
  }, []);

  const setDeletingItem = React.useCallback((item: EntityRecord | null) => {
    setDeletingItemState(item);
  }, []);

  const setCreating = React.useCallback((isCreating: boolean) => {
    setCreatingState(isCreating);
  }, []);

  return {
    editingItem,
    setEditingItem,
    deletingItem,
    setDeletingItem,
    creating,
    setCreating,
  };
}

/**
 * parseColumnFilters helper
 * Converts ColumnFiltersState to Record<string, unknown> filtering out empty values.
 */
export function parseColumnFilters(columnFilters: ColumnFiltersState): Record<string, unknown> {
  return columnFilters.reduce(
    (acc, f) => {
      if (f.value !== undefined && f.value !== null && f.value !== "") {
        acc[f.id] = f.value;
      }
      return acc;
    },
    {} as Record<string, unknown>,
  );
}

/**
 * areFiltersEqual helper
 * Performs shallow equality check of two filter objects.
 */
export function areFiltersEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  return keysA.length === keysB.length && keysA.every((k) => a[k] === b[k]);
}

/**
 * getVisibleColumnsList helper
 * Resolves list of active visible leaf column IDs.
 */
export function getVisibleColumnsList<TData>(table: Table<TData>): string[] {
  return table
    .getAllLeafColumns()
    .filter((col) => col.getIsVisible())
    .map((col) => col.id)
    .filter((id) => id !== "actions");
}

/**
 * isStringArrayEqual helper
 * Checks if two string arrays contain identical elements (order-independent).
 */
export function isStringArrayEqual(a: string[] | undefined, b: string[]): boolean {
  if (!a) return false;
  return a.length === b.length && b.every((val) => a.includes(val));
}
