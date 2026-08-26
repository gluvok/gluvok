/**
 * @file components/dashboard/card.tsx
 * @description Dashboard card component used on the main home screen to navigate to different project tables.
 */

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface DashboardCardProps {
  name: string;
  href: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

/**
 * DashboardCard Component
 * Displays a clickable grid card with an icon, name, description, and hover animations.
 */
export function DashboardCard({ name, href, desc, icon: Icon, color }: DashboardCardProps) {
  const cardId = `dashboard-card-${name.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <Link href={href} id={cardId} className="group block">
      <Card className="h-full border bg-card hover:border-muted-foreground/50 hover:bg-accent/50 transition-colors duration-200 cursor-pointer py-1">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div
              className={`p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors duration-200 ${color}`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
          <CardTitle className="font-bold text-md text-card-foreground group-hover:text-primary leading-none">
            {name}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            {desc}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
