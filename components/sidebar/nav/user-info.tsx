"use client"

/**
 * @file components/sidebar/nav/user-info.tsx
 * @description Small avatar block displaying user name, username, role badge, and profile avatar image.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuthStore } from "@/lib/store"

export interface UserInfo {
  username: string
  avatar: string
}

function formatRole(role: string | undefined): string {
  if (!role) return ""
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * UserAvatarInfo Component
 * Renders avatar image with fallback initials, username, and role label.
 */
export function UserAvatarInfo({ user }: { user: UserInfo }) {
  const authUser = useAuthStore((state) => state.user)
  const username = user.username || authUser?.username || ""
  const roleLabel = formatRole(authUser?.role)

  return (
    <>
      <Avatar className="h-8 w-8 rounded-lg shrink-0">
        <AvatarImage src={user.avatar} alt={username} />
        <AvatarFallback className="rounded-lg">
          {username ? username.slice(0, 2).toUpperCase() : "??"}
        </AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
        <span className="truncate font-medium">{username ? `@${username}` : "User"}</span>
        {roleLabel && (
          <span className="truncate text-[10px] text-muted-foreground font-normal">{roleLabel}</span>
        )}
      </div>
    </>
  )
}
