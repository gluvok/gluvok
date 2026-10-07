"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Logout01Icon,
  Notification01Icon,
  Sorting05Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";

export type UserProps = {
  name: string;
  email: string;
  avatar?: string;
  initials: string;
};

export function UserAvatarInfo({ user }: { user: UserProps }) {
  return (
    <>
      <Avatar>
        {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
        <AvatarFallback className="font-medium text-xs">{user.initials}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 leading-tight">
        <span className="truncate font-semibold">{user.name}</span>
        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
      </div>
    </>
  );
}

export function NavUser({ user }: { user: UserProps }) {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <UserAvatarInfo user={user} />
            <HugeiconsIcon icon={Sorting05Icon} />
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "bottom" : "right"}>
            <DropdownMenuGroup>
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatarInfo user={user} />
              </div>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <HugeiconsIcon icon={UserCircleIcon} />
                <span>Account</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HugeiconsIcon icon={Notification01Icon} />
                <span>Notifications</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <HugeiconsIcon icon={Logout01Icon} />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
