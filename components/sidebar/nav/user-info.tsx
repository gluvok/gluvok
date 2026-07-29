"use client"

/**
 * @file components/sidebar/nav/user-info.tsx
 * @description Small avatar block displaying user name and profile avatar image.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export interface UserInfo {
  name: string
  avatar: string
}

/**
 * UserAvatarInfo Component
 * Renders avatar image with fallback initials, along with user name.
 */
export function UserAvatarInfo({ user }: { user: UserInfo }) {
  return (
    <>
      <Avatar className="h-8 w-8 rounded-lg">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback className="rounded-lg">CN</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{user.name}</span>
      </div>
    </>
  )
}
