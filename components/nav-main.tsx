"use client";

import type { ComponentProps } from "react";
import type { SidebarGroup } from "@/components/ui/sidebar";
import { NavGroup } from "@/components/nav-group";
import { mainNavItems, type NavItem } from "@/lib/navigation";

export type { NavItem };

export function NavMain({
  items = mainNavItems,
  ...props
}: { items?: NavItem[] } & ComponentProps<typeof SidebarGroup>) {
  return <NavGroup label="Main" items={items} {...props} />;
}
