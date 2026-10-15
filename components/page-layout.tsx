import { PageHeader } from "@/components/page-header";

interface PageLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function PageLayout({ title, description, children }: PageLayoutProps) {
  return (
    <div className="flex flex-col gap-2.5 min-w-0">
      <PageHeader title={title} description={description} />
      {children}
    </div>
  );
}
