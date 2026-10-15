import type { Metadata } from "next";
import { PageLayout } from "@/components/page-layout";
import { EntriesDataTable } from "./data-table";

export const metadata: Metadata = {
  title: "Entries | Gluvok",
  description: "View and record incoming and outgoing transport entries.",
};

export default function EntriesPage() {
  return (
    <PageLayout
      title="Entries"
      description="View and record incoming and outgoing transport entries."
    >
      <EntriesDataTable />
    </PageLayout>
  );
}
