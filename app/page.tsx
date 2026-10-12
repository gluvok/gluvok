import Link from "next/link";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { appIcons } from "@/lib/icons";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

const sections = [
  {
    title: "Centers",
    description: "Manage processing facilities and operational locations.",
    href: "/centers",
    icon: appIcons.centers,
  },
  {
    title: "Entries",
    description: "View and record incoming and outgoing transport entries.",
    href: "/entries",
    icon: appIcons.entries,
  },
  {
    title: "Weighments",
    description: "Track weighbridge measurements, gross, tare, and net weights.",
    href: "/weighments",
    icon: appIcons.weighments,
  },
  {
    title: "Customers",
    description: "Maintain client profiles, billing contacts, and contracts.",
    href: "/customers",
    icon: appIcons.customers,
  },
  {
    title: "Users",
    description: "Configure system operators, roles, and access credentials.",
    href: "/users",
    icon: appIcons.users,
  },
  {
    title: "Settings",
    description: "Platform preferences, system defaults, and configurations.",
    href: "/settings",
    icon: appIcons.settings,
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight font-heading">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to Gluvok. Select a module from the sidebar or choose a section below.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.title}
            href={section.href}
            className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition-all duration-200 group-hover:border-primary/50 group-hover:bg-muted/30 group-hover:shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <HugeiconsIcon icon={section.icon} />
                  </div>
                  <CardTitle className="transition-colors group-hover:text-primary">
                    {section.title}
                  </CardTitle>
                </div>
                <CardAction>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="size-4 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
                  />
                </CardAction>
                <CardDescription className="mt-2 line-clamp-2">
                  {section.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
