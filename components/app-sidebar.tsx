"use client";

import * as React from "react";
import Link from "next/link";
import { appIcons } from "@/lib/icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavMain, type NavItem } from "@/components/nav-main";
import { NavSecondary, type NavSecondaryItem } from "@/components/nav-secondary";
import { NavUser, type UserProps } from "@/components/nav-user";

const navMainItems: NavItem[] = [
  {
    title: "Centers",
    url: "/centers",
    icon: appIcons.centers,
  },
  {
    title: "Entries",
    url: "/entries",
    icon: appIcons.entries,
  },
  {
    title: "Weighments",
    url: "/weighments",
    icon: appIcons.weighments,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: appIcons.customers,
  },
  {
    title: "Users",
    url: "/users",
    icon: appIcons.users,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: appIcons.settings,
  },
];

const navSecondaryItems: NavSecondaryItem[] = [
  {
    title: "Tickets",
    url: "/tickets",
    icon: appIcons.tickets,
  },
  {
    title: "Support",
    url: "/support",
    icon: appIcons.support,
  },
  {
    title: "Services",
    url: "/services",
    icon: appIcons.services,
  },
];

const currentUser: UserProps = {
  name: "User",
  email: "user@gluvok.com",
  initials: "US",
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
                G
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Gluvok</span>
                <span className="truncate text-xs text-muted-foreground">Management</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
