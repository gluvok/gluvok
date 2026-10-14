import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CustomersDataTable } from "./data-table";

export const metadata: Metadata = {
  title: "Customers | Gluvok",
  description: "Manage client profiles, agricultural suppliers, and portal credentials.",
};

export default function CustomersPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Customers"
        description="Manage client profiles, agricultural suppliers, and portal credentials."
      />

      <CustomersDataTable />
    </div>
  );
}
