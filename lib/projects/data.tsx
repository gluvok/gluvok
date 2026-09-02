/**
 * @file lib/projects/data.tsx
 * @description Helper component or configuration for project dashboards (data).
 */

import {
  Building,
  IndianRupee,
  Users,
  ClipboardList,
  Scale,
  UserCog,
  Tag,
  Settings,
} from "lucide-react";
import { ProjectSlug } from "@/lib/constants/enums";
import { type ProjectMetadata } from "./types";

export const PROJECTS: ProjectMetadata[] = [
  {
    slug: ProjectSlug.CENTERS,
    name: "Centers",
    desc: "Manage processing and collection centers",
    icon: Building,
    color: "text-stone-500",
  },
  {
    slug: ProjectSlug.COMMODITIES,
    name: "Commodities",
    desc: "Track trading products and goods catalog",
    icon: Tag,
    color: "text-amber-600/80 dark:text-amber-400/80",
  },
  {
    slug: ProjectSlug.RATES,
    name: "Rates",
    desc: "Track unit rates of commodities at factories",
    icon: IndianRupee,
    color: "text-emerald-700/80 dark:text-emerald-400/80",
  },
  {
    slug: ProjectSlug.CUSTOMERS,
    name: "Customers",
    desc: "Directory of client accounts and details",
    icon: Users,
    color: "text-stone-600 dark:text-stone-400",
  },
  {
    slug: ProjectSlug.ENTRIES,
    name: "Entries",
    desc: "Raw entry logs and vehicle scan records",
    icon: ClipboardList,
    color: "text-emerald-800/80 dark:text-emerald-300/80",
  },
  {
    slug: ProjectSlug.WEIGHMENTS,
    name: "Weighments",
    desc: "Merged double-entry weighment records",
    icon: Scale,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    slug: ProjectSlug.USERS,
    name: "Users",
    desc: "Manage users and account credentials",
    icon: UserCog,
    color: "text-stone-500 dark:text-stone-400",
  },
  {
    slug: ProjectSlug.SETTINGS,
    name: "Settings",
    desc: "Manage factory details and merge configuration",
    icon: Settings,
    color: "text-stone-400 dark:text-stone-500",
  },
];
