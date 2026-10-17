import type { Metadata } from "next";
import { UsersDataTable } from "@/app/users/data-table";

export const metadata: Metadata = {
  title: "Customers | Gluvok",
  description: "Manage client profiles, agricultural suppliers, and portal credentials.",
};

export default function CustomersPage() {
  return <UsersDataTable roleScope="customer" />;
}
