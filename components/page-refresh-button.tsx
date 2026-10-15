"use client";

import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon } from "@hugeicons/core-free-icons";

export function PageRefreshButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.location.reload()}
      className="h-7 gap-1.5 px-2.5 text-xs"
      title="Reload page"
    >
      <HugeiconsIcon icon={RefreshIcon} data-icon="inline-start" className="size-3" />
      <span>Refresh</span>
    </Button>
  );
}
