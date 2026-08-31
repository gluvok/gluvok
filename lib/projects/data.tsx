/**
 * @file lib/projects/data.tsx
 * @description Helper component or configuration for project dashboards (data).
 */

import { Building, IndianRupee, Users, ClipboardList, Scale, UserCog, Tag } from "lucide-react";
import { ProjectSlug } from "@/lib/constants/enums";
import { type ProjectMetadata } from "./types";

export const PROJECTS: ProjectMetadata[] = [
  {
    slug: ProjectSlug.CENTERS,
    name: "Centers",
    desc: "Manage processing and collection centers",
    icon: Building,
    color: "text-blue-500",
  },
  {
    slug: ProjectSlug.COMMODITIES,
    name: "Commodities",
    desc: "Track trading products and goods catalog",
    icon: Tag,
    color: "text-amber-500",
  },
  {
    slug: ProjectSlug.RATES,
    name: "Rates",
    desc: "Track unit rates of commodities at factories",
    icon: IndianRupee,
    color: "text-yellow-500",
  },
  {
    slug: ProjectSlug.CUSTOMERS,
    name: "Customers",
    desc: "Directory of client accounts and details",
    icon: Users,
    color: "text-green-500",
  },
  {
    slug: ProjectSlug.ENTRIES,
    name: "Entries",
    desc: "Raw entry logs and vehicle scan records",
    icon: ClipboardList,
    color: "text-indigo-500",
  },
  {
    slug: ProjectSlug.WEIGHMENTS,
    name: "Weighments",
    desc: "Merged double-entry weighment records",
    icon: Scale,
    color: "text-purple-500",
  },
  {
    slug: ProjectSlug.USERS,
    name: "Users",
    desc: "Manage users and account credentials",
    icon: UserCog,
    color: "text-pink-500",
  },
];
