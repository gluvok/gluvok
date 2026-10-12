"use client";

import type { ComponentProps } from "react";
import type { SidebarGroup } from "@/components/ui/sidebar";
import { NavGroup } from "@/components/nav-group";
import { secondaryNavItems, type NavItem } from "@/lib/navigation";

export type NavSecondaryItem = NavItem;

export function NavSecondary({
  items = secondaryNavItems,
  ...props
}: { items?: NavSecondaryItem[] } & ComponentProps<typeof SidebarGroup>) {
  return <NavGroup label="Secondary" items={items} {...props} />;
}
