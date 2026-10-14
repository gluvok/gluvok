"use client";

import { LoadingState } from "@/components/loading-state";

interface DataTableHydrationCardProps {
  message?: string;
}

export function DataTableHydrationCard({
  message = "Loading table preferences...",
}: DataTableHydrationCardProps) {
  return <LoadingState message={message} className="rounded-md border border-border bg-card" />;
}
