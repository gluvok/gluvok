"use client";

/**
 * @file components/sidebar/nav/user-dropdown.tsx
 * @description Dropdown panel content showing account details, sync status, and log out options.
 */

import {
  BadgeCheckIcon,
  CreditCardIcon,
  BellIcon,
  LogOutIcon,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserAvatarInfo, type UserInfo } from "./user-info";
import { useAuthStore, useEntitiesStore } from "@/lib/store";
import { AppRoutes } from "@/lib/constants/enums";

interface NavUserDropdownProps {
  user: UserInfo;
  isMobile: boolean;
}

const MENU_ITEMS = [
  { id: "user-menu-account", label: "Account", icon: BadgeCheckIcon },
  { id: "user-menu-billing", label: "Billing", icon: CreditCardIcon },
  { id: "user-menu-notifications", label: "Notifications", icon: BellIcon },
];

/**
 * NavUserDropdown Component
 * Populates dropdown options for the user trigger in the sidebar footer.
 */
export function NavUserDropdown({ user, isMobile }: NavUserDropdownProps) {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const filtersLoading = useEntitiesStore((state) => state.filtersLoading);
  const preloadAllFilters = useEntitiesStore((state) => state.preloadAllFilters);

  const handleLogout = async () => {
    await logout();
    router.push(AppRoutes.LOGIN);
  };

  const handleSyncData = () => {
    preloadAllFilters();
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
          id="user-menu-sync"
          onClick={handleSyncData}
          disabled={filtersLoading}
          className="cursor-pointer"
        >
          {filtersLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {filtersLoading ? "Syncing..." : "Sync Data"}
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.id} id={item.id}>
              <Icon className="mr-2 h-4 w-4" /> {item.label}
            </DropdownMenuItem>
          );
        })}
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
