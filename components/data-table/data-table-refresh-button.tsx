"use client";

import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export interface DataTableRefreshButtonProps {
  onRefresh: () => void;
  loading?: boolean;
}

export function DataTableRefreshButton({
  onRefresh,
  loading = false,
}: DataTableRefreshButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onRefresh}
      disabled={loading}
      className="h-8 gap-1.5 px-2.5 text-xs shrink-0"
      title="Refresh table data"
    >
      <HugeiconsIcon
        icon={RefreshIcon}
        className={cn("size-3.5", loading && "animate-spin")}
        data-icon="inline-start"
      />
      <span className="hidden sm:inline">Refresh</span>
    </Button>
  );
}
