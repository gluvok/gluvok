import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CentersDataTable } from "./data-table";

export const metadata: Metadata = {
  title: "Centers | Gluvok",
  description: "Manage processing facilities and operational locations.",
};

export default function CentersPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Centers"
        description="Manage processing facilities and operational locations."
      />

      <CentersDataTable />
    </div>
  );
}
