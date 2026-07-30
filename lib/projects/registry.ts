/**
 * @file lib/projects/registry.ts
 * @description Helper component or configuration for project dashboards (registry).
 */

import {
  Building,
  IndianRupee,
  Users,
  ClipboardList,
  UserCog,
  Tag,
  Settings,
} from "lucide-react";
import { ProjectName, ProjectSlug } from "@/lib/constants/enums";

export interface ProjectConfig {
  name: ProjectName;
  icon: React.ComponentType<{ className?: string }>;
}

export const PROJECT_REGISTRY: Record<string, ProjectConfig> = {
  [ProjectSlug.CENTERS]: { name: ProjectName.CENTERS, icon: Building },
  [ProjectSlug.COMMODITIES]: { name: ProjectName.COMMODITIES, icon: Tag },
  [ProjectSlug.RATES]: { name: ProjectName.RATES, icon: IndianRupee },
  [ProjectSlug.CUSTOMERS]: { name: ProjectName.CUSTOMERS, icon: Users },
  [ProjectSlug.WEIGHMENTS]: { name: ProjectName.WEIGHMENTS, icon: ClipboardList },
  [ProjectSlug.PROFILES]: { name: ProjectName.PROFILES, icon: UserCog },
  [ProjectSlug.CONFIGS]: { name: ProjectName.CONFIGS, icon: Settings },
};
