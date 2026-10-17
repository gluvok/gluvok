"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export function HeaderRefreshButton() {
  const [spinning, setSpinning] = useState<boolean>(false);

  const handleRefresh = () => {
    setSpinning(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app:table-refresh"));
    }
    setTimeout(() => {
      setSpinning(false);
    }, 600);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={spinning}
      className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
      title="Refresh data"
      aria-label="Refresh data"
    >
      <HugeiconsIcon
        icon={RefreshIcon}
        className={cn("size-3.5", spinning && "animate-spin")}
        data-icon="inline-start"
      />
      <span>Refresh</span>
    </Button>
  );
}
