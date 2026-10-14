import type { Metadata } from "next";
import { PageLayout } from "@/components/page-layout";
import { FactoryCard } from "./factory-card";

export const metadata: Metadata = {
  title: "Settings | Gluvok",
  description: "Platform preferences, system defaults, and factory configurations.",
};

export default function SettingsPage() {
  return (
    <div className="max-w-3xl">
      <PageLayout
        title="Settings"
        description="Platform preferences, system defaults, and factory configurations."
      >
        <FactoryCard />
      </PageLayout>
    </div>
  );
}
