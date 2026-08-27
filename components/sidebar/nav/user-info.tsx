"use client";

/**
 * @file components/sidebar/nav/user-info.tsx
 * @description Small avatar block displaying user name, username, role badge, and user avatar image.
 */

import { type LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/store";
import { getRoleIcon } from "@/lib/fields/helpers";

export interface UserInfo {
  username: string;
  role?: string;
  avatar: string;
}

export function RenderRoleIcon({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return <Icon className={className} />;
}

/**
 * UserAvatarInfo Component
 * Renders avatar image with fallback initials, user name, and side-by-side username + lowercase role with icon.
 */
export function UserAvatarInfo({ user }: { user: UserInfo }) {
  const authUser = useAuthStore((state) => state.user);
  const username = user.username || authUser?.username || "";
  const rawRole = user.role || authUser?.role || "admin";

  const roleIcon = getRoleIcon(rawRole);

  return (
    <>
      <Avatar className="h-8 w-8 rounded-lg shrink-0">
        <AvatarImage src={user.avatar} alt={username} />
        <AvatarFallback className="rounded-lg">
          {username ? username.slice(0, 2).toUpperCase() : "??"}
        </AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-xs leading-tight min-w-0 gap-0.5">
        <span className="truncate font-semibold text-xs text-foreground">
          @{username || "user"}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          {username && <span className="truncate font-mono">@{username}</span>}
          {username && <span>•</span>}
          <div className="flex items-center gap-1 shrink-0">
            <RenderRoleIcon icon={roleIcon} className="size-3! shrink-0 text-muted-foreground" />
            <span>{rawRole}</span>
          </div>
        </div>
      </div>
    </>
  );
}
