"use client";

import * as React from "react";
import Link from "next/link";
import {
  Briefcase01Icon,
  Building01Icon,
  ClipboardListIcon,
  CustomerSupportIcon,
  Settings01Icon,
  Ticket01Icon,
  UserGroupIcon,
  UserIcon,
  WeightScale01Icon,
} from "@hugeicons/core-free-icons";
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
    icon: Building01Icon,
  },
  {
    title: "Entries",
    url: "/entries",
    icon: ClipboardListIcon,
  },
  {
    title: "Weighments",
    url: "/weighments",
    icon: WeightScale01Icon,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: UserGroupIcon,
  },
  {
    title: "Users",
    url: "/users",
    icon: UserIcon,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings01Icon,
  },
];

const navSecondaryItems: NavSecondaryItem[] = [
  {
    title: "Tickets",
    url: "/tickets",
    icon: Ticket01Icon,
  },
  {
    title: "Support",
    url: "/support",
    icon: CustomerSupportIcon,
  },
  {
    title: "Services",
    url: "/services",
    icon: Briefcase01Icon,
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
