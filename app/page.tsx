import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Building01Icon,
  ClipboardListIcon,
  ContactRoundIcon,
  Settings01Icon,
  UserIcon,
  WeightScale01Icon,
} from "@hugeicons/core-free-icons";

const sections = [
  {
    title: "Centers",
    description: "Manage processing facilities and operational locations.",
    href: "/centers",
    icon: Building01Icon,
  },
  {
    title: "Entries",
    description: "View and record incoming and outgoing transport entries.",
    href: "/entries",
    icon: ClipboardListIcon,
  },
  {
    title: "Weighments",
    description: "Track weighbridge measurements, gross, tare, and net weights.",
    href: "/weighments",
    icon: WeightScale01Icon,
  },
  {
    title: "Customers",
    description: "Maintain client profiles, billing contacts, and contracts.",
    href: "/customers",
    icon: ContactRoundIcon,
  },
  {
    title: "Users",
    description: "Configure system operators, roles, and access credentials.",
    href: "/users",
    icon: UserIcon,
  },
  {
    title: "Settings",
    description: "Platform preferences, system defaults, and configurations.",
    href: "/settings",
    icon: Settings01Icon,
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-heading">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to Gluvok. Select a module from the sidebar or choose a section below.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title} className="flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-md bg-muted text-foreground">
                  <HugeiconsIcon icon={section.icon} />
                </div>
                <CardTitle>{section.title}</CardTitle>
              </div>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">Quick access module</span>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                nativeButton={false}
                render={<Link href={section.href} />}
              >
                <span>Open {section.title}</span>
                <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
