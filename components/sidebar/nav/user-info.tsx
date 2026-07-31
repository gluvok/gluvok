"use client"

/**
 * @file components/sidebar/nav/user-info.tsx
 * @description Small avatar block displaying user name, username, role badge, and profile avatar image.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuthStore } from "@/lib/store"
import { RolePill } from "@/components/kibo-ui/pill"

export interface UserInfo {
  username: string
  role?: string
  avatar: string
}

/**
 * UserAvatarInfo Component
 * Renders avatar image with fallback initials, username, and unified role pill with color mapping.
 */
export function UserAvatarInfo({ user }: { user: UserInfo }) {
  const authUser = useAuthStore((state) => state.user)
  const username = user.username || authUser?.username || ""
  const rawRole = user.role || authUser?.role || "admin"

  return (
    <>
      <Avatar className="h-8 w-8 rounded-lg shrink-0">
        <AvatarImage src={user.avatar} alt={username} />
        <AvatarFallback className="rounded-lg">
          {username ? username.slice(0, 2).toUpperCase() : "??"}
        </AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-xs leading-tight min-w-0 gap-0.5">
        <span className="truncate font-medium text-sm">{username ? `@${username}` : "User"}</span>
        <div className="flex items-center">
          <RolePill role={rawRole} className="h-4 text-[9px] px-1.5 py-0 gap-1 w-fit" />
        </div>
      </div>
    </>
  )
}
