/**
 * @file lib/projects/types.ts
 * @description Helper component or configuration for project dashboards (types).
 */

import { type LucideIcon } from "lucide-react";
import { ProjectSlug } from "@/lib/constants/enums";

export interface ProjectMetadata {
  slug: ProjectSlug;
  name: string;
  desc: string;
  icon: LucideIcon;
  color: string;
}
