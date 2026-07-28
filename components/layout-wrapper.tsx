"use client"

/**
 * @file components/layout-wrapper.tsx
 * @description Layout wrapper component for the application.
 * Manages route guarding, main layouts, sidebar rendering, and unlinked profile screens.
 */

import * as React from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AuthGuard } from "@/components/auth/guard"
import { AppRoutes } from "@/lib/constants/enums"
import { AUTH_ROUTES } from "@/lib/constants"
import { useAuthStore } from "@/lib/store"
import { UnlinkedProfile } from "@/components/auth/unlinked-profile"

/**
 * MainLayout Component
 * Conditionally wraps page content based on authentication state, active route type,
 * and profile link status. Adds the AppSidebar structure for authorized dashboard routes.
 */
export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = AUTH_ROUTES.includes(pathname as AppRoutes)
  const user = useAuthStore((state) => state.user)

  if (isAuthPage) {
    return <AuthGuard>{children}</AuthGuard>
  }

  // If user is authenticated but has neither a profile nor a customer record linked
  if (user && !user.profile && !user.customer) {
    return (
      <AuthGuard>
        <UnlinkedProfile />
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <SidebarProvider defaultOpen={!!user}>
        <AppSidebar />
        <SidebarInset>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
