"use client"

/**
 * @file components/sidebar/nav/user-info.tsx
 * @description Small avatar block displaying user name, username, role badge, and profile avatar image.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuthStore } from "@/lib/store"

export interface UserInfo {
  name: string
  avatar: string
}

function formatRole(role: string | undefined): string {
  if (!role) return ""
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * UserAvatarInfo Component
 * Renders avatar image with fallback initials, user name, username, and role label.
 */
export function UserAvatarInfo({ user }: { user: UserInfo }) {
  const authUser = useAuthStore((state) => state.user)
  const username = authUser?.username
  const roleLabel = formatRole(authUser?.role)

  const details = [
    username ? `@${username}` : null,
    roleLabel || null,
  ].filter(Boolean).join(" • ")

  return (
    <>
      <Avatar className="h-8 w-8 rounded-lg shrink-0">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback className="rounded-lg">
          {user.name ? user.name.slice(0, 2).toUpperCase() : "??"}
        </AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
        <span className="truncate font-medium">{user.name}</span>
        {details && (
          <span className="truncate text-[10px] text-muted-foreground font-normal">{details}</span>
        )}
      </div>
    </>
  )
}
