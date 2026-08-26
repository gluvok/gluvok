"use client";

/**
 * @file components/sidebar/nav/main.tsx
 * @description Primary navigation group rendering lists of project links.
 */

import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "@/components/ui/sidebar";
import { NavMainItem } from "./main-item";

/**
 * NavMain Component
 * Groups and maps NavMainItem elements inside the sidebar under a "Platform" label.
 */
export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: React.ReactNode;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <NavMainItem key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
