"use client";

import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export interface PageRefreshButtonProps extends ComponentProps<typeof Button> {
  label?: string;
}

export function PageRefreshButton({
  label = "Refresh",
  className,
  onClick,
  ...props
}: PageRefreshButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick ?? (() => window.location.reload())}
      className={cn("h-8 gap-1.5 px-3 text-xs", className)}
      title="Reload page"
      {...props}
    >
      <HugeiconsIcon icon={RefreshIcon} data-icon="inline-start" className="size-3.5" />
      <span>{label}</span>
    </Button>
  );
}
