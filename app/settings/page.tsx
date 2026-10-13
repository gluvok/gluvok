import type { Metadata } from "next";
import { FactoryCard } from "./factory-card";

export const metadata: Metadata = {
  title: "Settings | Gluvok",
  description: "Platform preferences, system defaults, and factory configurations.",
};

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight font-heading">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Platform preferences, system defaults, and factory configurations.
        </p>
      </div>

      <div className="flex w-full justify-center">
        <FactoryCard />
      </div>
    </div>
  );
}
