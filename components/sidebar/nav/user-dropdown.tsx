"use client";

/**
 * @file components/sidebar/nav/user-dropdown.tsx
 * @description Dropdown panel content showing account details and log out options.
 */

import { BadgeCheckIcon, CreditCardIcon, BellIcon, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserAvatarInfo, type UserInfo } from "./user-info";
import { useAuthStore } from "@/lib/store";
import { AppRoutes } from "@/lib/constants";

interface NavUserDropdownProps {
  user: UserInfo;
  isMobile: boolean;
}

/**
 * NavUserDropdown Component
 * Populates dropdown options for the user trigger in the sidebar footer.
 */
export function NavUserDropdown({ user, isMobile }: NavUserDropdownProps) {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await logout();
    router.push(AppRoutes.LOGIN);
  };

  return (
    <DropdownMenuContent
      className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
      side={isMobile ? "bottom" : "right"}
      align="end"
      sideOffset={4}
    >
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <UserAvatarInfo user={user} />
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem
          id="user-menu-account"
          className="cursor-pointer"
          onClick={() => router.push(AppRoutes.ACCOUNT)}
        >
          <BadgeCheckIcon className="mr-2 h-4 w-4" /> Account
        </DropdownMenuItem>
        <DropdownMenuItem id="user-menu-billing">
          <CreditCardIcon className="mr-2 h-4 w-4" /> Billing
        </DropdownMenuItem>
        <DropdownMenuItem id="user-menu-notifications">
          <BellIcon className="mr-2 h-4 w-4" /> Notifications
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        id="user-menu-logout"
        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
        onClick={handleLogout}
      >
        <LogOutIcon className="mr-2 h-4 w-4 text-destructive" /> Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}
