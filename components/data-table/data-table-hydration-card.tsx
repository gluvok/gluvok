"use client";

import { Spinner } from "@/components/ui/spinner";

interface DataTableHydrationCardProps {
  message?: string;
}

export function DataTableHydrationCard({
  message = "Loading table preferences...",
}: DataTableHydrationCardProps) {
  return (
    <div className="flex h-64 items-center justify-center rounded-md border border-border bg-card">
      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Spinner className="size-6 text-muted-foreground" />
        <span className="text-xs">{message}</span>
      </div>
    </div>
  );
}
