"use client";

import { useRef } from "react";
import { useDataTableStore } from "@/stores/use-data-table-store";
import type { TableItemState } from "@/lib/table-cookie";

export interface DataTableStoreInitializerProps {
  initialTables: Record<string, TableItemState>;
}

export function DataTableStoreInitializer({ initialTables }: DataTableStoreInitializerProps) {
  const initialized = useRef(false);

  if (!initialized.current) {
    useDataTableStore.getState().initFromCookies(initialTables);
    initialized.current = true;
  }

  return null;
}
