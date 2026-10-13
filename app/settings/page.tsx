import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { FactoryCard } from "./factory-card";

export const metadata: Metadata = {
  title: "Settings | Gluvok",
  description: "Platform preferences, system defaults, and factory configurations.",
};

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Settings"
        description="Platform preferences, system defaults, and factory configurations."
      />

      <FactoryCard />
    </div>
  );
}
