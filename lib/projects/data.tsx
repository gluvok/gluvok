/**
 * @file lib/projects/data.tsx
 * @description Helper component or configuration for project dashboards (data).
 */

import {
  Building,
  IndianRupee,
  Users,
  ClipboardList,
  UserCog,
  Tag,
  Settings,
} from "lucide-react"
import { ProjectSlug } from "@/lib/constants/enums"
import { ProjectName } from "@/lib/constants/enums"
import { type ProjectMetadata } from "./types"

export const PROJECTS: ProjectMetadata[] = [
  { slug: ProjectSlug.CENTERS, name: ProjectName.CENTERS, desc: "Manage processing and collection centers", icon: Building, color: "text-blue-500" },
  { slug: ProjectSlug.COMMODITIES, name: ProjectName.COMMODITIES, desc: "Track trading products and goods catalog", icon: Tag, color: "text-amber-500" },
  { slug: ProjectSlug.RATES, name: ProjectName.RATES, desc: "Track unit rates of commodities at factories", icon: IndianRupee, color: "text-yellow-500" },
  { slug: ProjectSlug.CUSTOMERS, name: ProjectName.CUSTOMERS, desc: "Directory of client accounts and details", icon: Users, color: "text-green-500" },
  { slug: ProjectSlug.ENTRIES, name: ProjectName.ENTRIES, desc: "Raw entry logs and vehicle scan records", icon: ClipboardList, color: "text-indigo-500" },
  { slug: ProjectSlug.WEIGHMENTS, name: ProjectName.WEIGHMENTS, desc: "Merged double-entry weighment records", icon: ClipboardList, color: "text-purple-500" },
  { slug: ProjectSlug.PROFILES, name: ProjectName.PROFILES, desc: "Manage user profiles and credentials", icon: UserCog, color: "text-pink-500" },
  { slug: ProjectSlug.SETTINGS, name: ProjectName.SETTINGS, desc: "Manage factory settings and requirement modes", icon: Settings, color: "text-slate-500" },
]
