import type { Metadata } from "next";
import { CentersDataTable } from "./data-table";

export const metadata: Metadata = {
  title: "Centers | Gluvok",
  description: "Manage processing facilities and operational locations.",
};

export default function CentersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight font-heading">Centers</h1>
        <p className="text-sm text-muted-foreground">
          Manage processing facilities and operational locations.
        </p>
      </div>

      <CentersDataTable />
    </div>
  );
}
