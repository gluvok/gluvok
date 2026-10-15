import { PageRefreshButton } from "@/components/page-refresh-button";

export interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="text-xl font-bold tracking-tight font-heading">{title}</h1>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <PageRefreshButton />
    </div>
  );
}
