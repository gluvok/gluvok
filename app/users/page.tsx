import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { UsersDataTable } from "./data-table";

export const metadata: Metadata = {
  title: "Users | Gluvok",
  description: "Configure system operators, roles, and access credentials.",
};

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Users"
        description="Configure system operators, roles, and access credentials."
      />

      <UsersDataTable roleScope="staff" />
    </div>
  );
}
