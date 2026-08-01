"use client"

/**
 * @file components/sidebar/nav/user-info.tsx
 * @description Small avatar block displaying user name, username, role badge, and profile avatar image.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuthStore } from "@/lib/store"
import { RolePill } from "@/components/kibo-ui/pill"

export interface UserInfo {
  name?: string
  username: string
  role?: string
  avatar: string
}

/**
 * UserAvatarInfo Component
 * Renders avatar image with fallback initials, user name, username, and unified role pill.
 */
export function UserAvatarInfo({ user }: { user: UserInfo }) {
  const authUser = useAuthStore((state) => state.user)
  const displayName = user.name || authUser?.name || user.username || authUser?.username || "User"
  const username = user.username || authUser?.username || ""
  const rawRole = user.role || authUser?.role || "admin"

  return (
    <>
      <Avatar className="h-8 w-8 rounded-lg shrink-0">
        <AvatarImage src={user.avatar} alt={displayName} />
        <AvatarFallback className="rounded-lg">
          {displayName ? displayName.slice(0, 2).toUpperCase() : "??"}
        </AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-xs leading-tight min-w-0 gap-0.5">
        <span className="truncate font-semibold text-xs text-foreground">{displayName}</span>
        {username && (
          <span className="truncate text-[10px] text-muted-foreground font-mono">@{username}</span>
        )}
        <div className="flex items-center mt-0.5">
          <RolePill role={rawRole} className="h-4 text-[9px] px-1.5 py-0 gap-1 w-fit" />
        </div>
      </div>
    </>
  )
}
