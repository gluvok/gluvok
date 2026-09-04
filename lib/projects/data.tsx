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
    color: "text-blue-600 dark:text-blue-400",
    theme: {
      iconColor: "text-blue-600 dark:text-blue-400",
      badgeBg: "bg-blue-500/10 dark:bg-blue-500/15",
      badgeBorder: "border-blue-500/20 dark:border-blue-500/30",
      cardHoverBorder: "group-hover:border-blue-500/40 dark:group-hover:border-blue-400/40",
      cardHoverBg: "group-hover:bg-blue-500/[0.03] dark:group-hover:bg-blue-500/[0.06]",
      hoverAccent: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
    },
  },
  {
    slug: ProjectSlug.COMMODITIES,
    name: "Commodities",
    desc: "Track trading products and goods catalog",
    icon: Tag,
    color: "text-amber-600 dark:text-amber-400",
    theme: {
      iconColor: "text-amber-600 dark:text-amber-400",
      badgeBg: "bg-amber-500/10 dark:bg-amber-500/15",
      badgeBorder: "border-amber-500/20 dark:border-amber-500/30",
      cardHoverBorder: "group-hover:border-amber-500/40 dark:group-hover:border-amber-400/40",
      cardHoverBg: "group-hover:bg-amber-500/[0.03] dark:group-hover:bg-amber-500/[0.06]",
      hoverAccent: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
    },
  },
  {
    slug: ProjectSlug.RATES,
    name: "Rates",
    desc: "Track unit rates of commodities at factories",
    icon: IndianRupee,
    color: "text-emerald-600 dark:text-emerald-400",
    theme: {
      iconColor: "text-emerald-600 dark:text-emerald-400",
      badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      badgeBorder: "border-emerald-500/20 dark:border-emerald-500/30",
      cardHoverBorder: "group-hover:border-emerald-500/40 dark:group-hover:border-emerald-400/40",
      cardHoverBg: "group-hover:bg-emerald-500/[0.03] dark:group-hover:bg-emerald-500/[0.06]",
      hoverAccent: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    },
  },
  {
    slug: ProjectSlug.CUSTOMERS,
    name: "Customers",
    desc: "Directory of client accounts and details",
    icon: Users,
    color: "text-indigo-600 dark:text-indigo-400",
    theme: {
      iconColor: "text-indigo-600 dark:text-indigo-400",
      badgeBg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      badgeBorder: "border-indigo-500/20 dark:border-indigo-500/30",
      cardHoverBorder: "group-hover:border-indigo-500/40 dark:group-hover:border-indigo-400/40",
      cardHoverBg: "group-hover:bg-indigo-500/[0.03] dark:group-hover:bg-indigo-500/[0.06]",
      hoverAccent: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
    },
  },
  {
    slug: ProjectSlug.ENTRIES,
    name: "Entries",
    desc: "Raw entry logs and vehicle scan records",
    icon: ClipboardList,
    color: "text-cyan-600 dark:text-cyan-400",
    theme: {
      iconColor: "text-cyan-600 dark:text-cyan-400",
      badgeBg: "bg-cyan-500/10 dark:bg-cyan-500/15",
      badgeBorder: "border-cyan-500/20 dark:border-cyan-500/30",
      cardHoverBorder: "group-hover:border-cyan-500/40 dark:group-hover:border-cyan-400/40",
      cardHoverBg: "group-hover:bg-cyan-500/[0.03] dark:group-hover:bg-cyan-500/[0.06]",
      hoverAccent: "group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
    },
  },
  {
    slug: ProjectSlug.WEIGHMENTS,
    name: "Weighments",
    desc: "Merged double-entry weighment records",
    icon: Scale,
    color: "text-teal-600 dark:text-teal-400",
    theme: {
      iconColor: "text-teal-600 dark:text-teal-400",
      badgeBg: "bg-teal-500/10 dark:bg-teal-500/15",
      badgeBorder: "border-teal-500/20 dark:border-teal-500/30",
      cardHoverBorder: "group-hover:border-teal-500/40 dark:group-hover:border-teal-400/40",
      cardHoverBg: "group-hover:bg-teal-500/[0.03] dark:group-hover:bg-teal-500/[0.06]",
      hoverAccent: "group-hover:text-teal-600 dark:group-hover:text-teal-400",
    },
  },
  {
    slug: ProjectSlug.USERS,
    name: "Users",
    desc: "Manage users and account credentials",
    icon: UserCog,
    color: "text-rose-600 dark:text-rose-400",
    theme: {
      iconColor: "text-rose-600 dark:text-rose-400",
      badgeBg: "bg-rose-500/10 dark:bg-rose-500/15",
      badgeBorder: "border-rose-500/20 dark:border-rose-500/30",
      cardHoverBorder: "group-hover:border-rose-500/40 dark:group-hover:border-rose-400/40",
      cardHoverBg: "group-hover:bg-rose-500/[0.03] dark:group-hover:bg-rose-500/[0.06]",
      hoverAccent: "group-hover:text-rose-600 dark:group-hover:text-rose-400",
    },
  },
  {
    slug: ProjectSlug.SETTINGS,
    name: "Settings",
    desc: "Manage factory details and merge configuration",
    icon: Settings,
    color: "text-slate-600 dark:text-slate-300",
    theme: {
      iconColor: "text-slate-600 dark:text-slate-300",
      badgeBg: "bg-slate-500/10 dark:bg-slate-500/15",
      badgeBorder: "border-slate-500/20 dark:border-slate-500/30",
      cardHoverBorder: "group-hover:border-slate-400/50 dark:group-hover:border-slate-500/50",
      cardHoverBg: "group-hover:bg-slate-500/[0.03] dark:group-hover:bg-slate-500/[0.06]",
      hoverAccent: "group-hover:text-slate-700 dark:group-hover:text-slate-200",
    },
  },
];
