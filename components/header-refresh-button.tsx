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
      variant="ghost"
      size="icon-sm"
      onClick={handleRefresh}
      disabled={spinning}
      className="text-muted-foreground hover:text-foreground cursor-pointer"
      title="Refresh data"
      aria-label="Refresh data"
    >
      <HugeiconsIcon icon={RefreshIcon} className={cn("size-3.5", spinning && "animate-spin")} />
      <span className="sr-only">Refresh data</span>
    </Button>
  );
}
