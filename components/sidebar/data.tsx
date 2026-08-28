/**
 * @file components/sidebar/data.tsx
 * @description Static navigation configuration data for mapping user navigation and project routes in the sidebar.
 */

import { LifeBuoy, Send, Layers } from "lucide-react";
import { PROJECTS } from "@/lib/projects";
import { DEFAULT_AVATAR, AppRoutes } from "@/lib/constants";
import { Role } from "@/lib/constants/enums";

/**
 * SIDEBAR_DATA configuration
 * Structures secondary support links, default user avatars, and maps active registry projects to main menu items.
 */
export const SIDEBAR_DATA = {
  user: {
    name: "Admin",
    username: "admin",
    role: Role.ADMIN,
    avatar: DEFAULT_AVATAR,
  },
  navSecondary: [
    {
      title: "Support",
      url: AppRoutes.SUPPORT,
      icon: <LifeBuoy />,
    },
    {
      title: "Feedback",
      url: AppRoutes.FEEDBACK,
      icon: <Send />,
    },
    {
      title: "Services",
      url: AppRoutes.SERVICES,
      icon: <Layers />,
    },
  ],
  navMain: PROJECTS.map((project) => {
    const Icon = project.icon;
    return {
      title: project.name,
      url: `/projects/${project.slug}`,
      icon: <Icon />,
    };
  }),
};
