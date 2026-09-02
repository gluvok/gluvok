/**
 * @file lib/projects/registry.ts
 * @description Helper component or configuration for project dashboards (registry).
 */

import { Ticket } from "lucide-react";
import { ProjectSlug } from "@/lib/constants/enums";
import { PROJECTS } from "./data";

export interface ProjectConfig {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

export const PROJECT_REGISTRY: Record<string, ProjectConfig> = {
  ...PROJECTS.reduce(
    (acc, project) => {
      acc[project.slug] = {
        name: project.name,
        icon: project.icon,
        desc: project.desc,
      };
      return acc;
    },
    {} as Record<string, ProjectConfig>,
  ),
  [ProjectSlug.TICKETS]: {
    name: "Tickets",
    icon: Ticket,
    desc: "Track and review support tickets raised for entries and weighments",
  },
};
