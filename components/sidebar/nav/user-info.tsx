"use client"

/**
 * @file components/sidebar/nav/user-info.tsx
 * @description Small avatar block displaying user name, role badge, and profile avatar image.
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
 * Renders avatar image with fallback initials, user name, and role label.
 */
export function UserAvatarInfo({ user }: { user: UserInfo }) {
  const role = useAuthStore((state) => state.user?.role)
  const roleLabel = formatRole(role)

  return (
    <>
      <Avatar className="h-8 w-8 rounded-lg">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback className="rounded-lg">
          {user.name ? user.name.slice(0, 2).toUpperCase() : "??"}
        </AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{user.name}</span>
        {roleLabel && (
          <span className="truncate text-[10px] text-muted-foreground font-normal capitalize">{roleLabel}</span>
        )}
      </div>
    </>
  )
}
