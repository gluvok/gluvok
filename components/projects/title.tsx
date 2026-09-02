/**
 * @file components/projects/title.tsx
 * @description Heading component displayed at the top of each project dashboard.
 */

import * as React from "react";

import { LayoutDashboard } from "lucide-react";
import { PROJECTS } from "@/lib/projects";

interface ProjectTitleProps {
  projectName: string;
  Icon?: React.ComponentType<{ className?: string }>;
  projectSlug?: string;
  desc?: string;
  actions?: React.ReactNode;
}

/**
 * ProjectTitle Component
 * Renders the main page header name, icon, and dynamic metadata descriptive subtitle.
 */
export function ProjectTitle({
  projectName,
  Icon: CustomIcon,
  projectSlug,
  desc,
  actions,
}: ProjectTitleProps) {
  const projectMeta = PROJECTS.find(
    (p) => (projectSlug && p.slug === projectSlug) || p.name === projectName,
  );
  const Icon = CustomIcon || projectMeta?.icon || LayoutDashboard;
  const description =
    desc ||
    projectMeta?.desc ||
    `Manage the directory of ${projectName.toLowerCase()}, edit records, and configure settings.`;

  return (
    <div className="flex flex-col gap-1.5 mb-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground min-w-0">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
          <span className="truncate">{projectName}</span>
        </h1>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
