/**
 * @file components/projects/title.tsx
 * @description Heading component displayed at the top of each project dashboard.
 */

import * as React from "react"

import { PROJECTS } from "@/lib/projects"

interface ProjectTitleProps {
  projectName: string;
  Icon: React.ComponentType<{ className?: string }>;
  projectSlug?: string;
  desc?: string;
}

/**
 * ProjectTitle Component
 * Renders the main page header name, icon, and dynamic metadata descriptive subtitle.
 */
export function ProjectTitle({ projectName, Icon, projectSlug, desc }: ProjectTitleProps) {
  const projectMeta = PROJECTS.find(
    (p) => (projectSlug && p.slug === projectSlug) || p.name === projectName
  )
  const description = desc || projectMeta?.desc || `Manage the directory of ${projectName.toLowerCase()}, edit records, and configure settings.`

  return (
    <div className="flex flex-col gap-1.5 mb-6">
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
        <Icon className="h-6 w-6 text-primary" />
        {projectName}
      </h1>
      <p className="text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
