/**
 * @file lib/projects/registry.ts
 * @description Helper component or configuration for project dashboards (registry).
 */

import { ProjectName } from "@/lib/constants/enums";
import { PROJECTS } from "./data";

export interface ProjectConfig {
  name: ProjectName;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

export const PROJECT_REGISTRY: Record<string, ProjectConfig> = PROJECTS.reduce(
  (acc, project) => {
    acc[project.slug] = {
      name: project.name,
      icon: project.icon,
      desc: project.desc,
    };
    return acc;
  },
  {} as Record<string, ProjectConfig>,
);
