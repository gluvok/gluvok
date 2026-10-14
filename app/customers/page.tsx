import type { Metadata } from "next";
import { PageLayout } from "@/components/page-layout";
import { UsersDataTable } from "@/app/users/data-table";

export const metadata: Metadata = {
  title: "Customers | Gluvok",
  description: "Manage client profiles, agricultural suppliers, and portal credentials.",
};

export default function CustomersPage() {
  return (
    <PageLayout
      title="Customers"
      description="Manage client profiles, agricultural suppliers, and portal credentials."
    >
      <UsersDataTable roleScope="customer" />
    </PageLayout>
  );
}
