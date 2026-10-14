import type { Metadata } from "next";
import { PageLayout } from "@/components/page-layout";
import { CentersDataTable } from "./data-table";

export const metadata: Metadata = {
  title: "Centers | Gluvok",
  description: "Manage processing facilities and operational locations.",
};

export default function CentersPage() {
  return (
    <PageLayout
      title="Centers"
      description="Manage processing facilities and operational locations."
    >
      <CentersDataTable />
    </PageLayout>
  );
}
