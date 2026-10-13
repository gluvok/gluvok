import type { ReactNode } from "react";
import { PageRefreshButton } from "@/components/page-refresh-button";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight font-heading">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <PageRefreshButton />
    </div>
  );
}
