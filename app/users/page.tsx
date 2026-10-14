import type { Metadata } from "next";
import { PageLayout } from "@/components/page-layout";
import { UsersDataTable } from "./data-table";

export const metadata: Metadata = {
  title: "Users | Gluvok",
  description: "Configure system operators, roles, and access credentials.",
};

export default function UsersPage() {
  return (
    <PageLayout
      title="Users"
      description="Configure system operators, roles, and access credentials."
    >
      <UsersDataTable roleScope="staff" />
    </PageLayout>
  );
}
