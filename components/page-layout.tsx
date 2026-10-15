import { PageHeader } from "@/components/page-header";

interface PageLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function PageLayout({ title, description, children }: PageLayoutProps) {
  return (
    <div className="flex flex-1 flex-col gap-2.5 min-w-0 min-h-0 h-full overflow-hidden">
      <div className="shrink-0">
        <PageHeader title={title} description={description} />
      </div>
      {children}
    </div>
  );
}
