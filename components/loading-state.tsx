import * as React from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
  return (
    <div className={cn("flex h-64 items-center justify-center", className)}>
      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Spinner className="size-6 text-primary" />
        <span className="text-xs">{message}</span>
      </div>
    </div>
  );
}
