import * as React from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  className?: string;
}

export function LoadingState({ className }: LoadingStateProps) {
  return (
    <div className={cn("flex flex-1 min-h-0 h-full w-full items-center justify-center", className)}>
      <Spinner className="size-6 text-primary" />
    </div>
  );
}
