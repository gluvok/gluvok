"use client"

/**
 * @file components/auth/unlinked-profile.tsx
 * @description Page/component shown when a user is successfully logged in to Auth
 * but does not yet have a linked Profile row in the database.
 */

import { useAuthStore } from "@/lib/store"
import { UserX, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * UnlinkedProfile Component
 * Renders an informative fallback screen telling the user they lack a database profile,
 * providing a log out action so they can switch accounts or try again.
 */
export function UnlinkedProfile() {
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  if (!user) return null

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 md:p-12 text-center select-none">
      <div className="max-w-md w-full space-y-8 flex flex-col items-center justify-center">
        {/* Illustration container */}
        <div className="relative">
          <div className="absolute inset-0 bg-destructive/10 rounded-full blur-2xl scale-110" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-card border shadow-sm">
            <UserX className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            No Profile Linked
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            Your account <strong className="text-foreground">{user.username}</strong> is not associated with an active profile. Please contact an administrator to link your account.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 w-full">
          <Button onClick={() => logout()} variant="outline" className="gap-2 h-10 px-4">
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </div>
    </div>
  )
}
