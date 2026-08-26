"use client";

/**
 * @file components/sidebar/nav/user.tsx
 * @description Sidebar user panel footer trigger containing avatar layout and binding trigger events to open NavUserDropdown.
 */

import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChevronsUpDownIcon } from "lucide-react";
import { UserAvatarInfo, type UserInfo } from "./user-info";
import { NavUserDropdown } from "./user-dropdown";

/**
 * NavUser Component
 * Combines avatar block and dropdown trigger to enable user configurations in the sidebar footer.
 */
export function NavUser({ user }: { user: UserInfo }) {
  const { isMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              id="user-menu-trigger"
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              closeOnMobileClick={false}
            >
              <UserAvatarInfo user={user} />
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <NavUserDropdown user={user} isMobile={isMobile} />
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
