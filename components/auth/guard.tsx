"use client"

/**
 * @file components/auth/guard.tsx
 * @description Authentication and authorization guard wrapper.
 * Protects client routes and redirects unauthenticated or unauthorized users appropriately.
 */

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  useAuthStore,
  useFactoryStore,
  useEntitiesStore,
  hasPageAccess,
} from "@/lib/store";
import { AppRoutes } from "@/lib/constants/enums"
import { AUTH_ROUTES, PUBLIC_ROUTES } from "@/lib/constants"
import NotFound from "@/app/not-found"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar"
import { getNextParam, getNextRedirectUrl } from "@/lib/utils"

/**
 * FullScreenStatus Component
 * Displays a minimal, centered loading or redirecting message covering the viewport.
 */
export function FullScreenStatus({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-xs font-mono text-muted-foreground">
      {message}
    </div>
  )
}

/**
 * AuthGuard Component
 * Handles client-side routing protection.
 * Ensures users are authenticated to view pages, validates project-level permissions (authorization),
 * and redirects logged-in users away from authentication pages.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const authHydrated = useAuthStore((state) => state.hydrated);
  const initialized = useAuthStore((state) => state.initialized);
  const profileLoading = useAuthStore((state) => state.profileLoading);

  const factoryInitialized = useFactoryStore(
    (state) => state.factoryInitialized,
  );
  const filtersInitialized = useEntitiesStore(
    (state) => state.filtersInitialized,
  );

  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = AUTH_ROUTES.includes(pathname as AppRoutes);
  const isPublicPage = PUBLIC_ROUTES.includes(pathname as AppRoutes);
  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectSlug = projectMatch ? projectMatch[1] : null;

  const isAuthorized =
    !user ||
    isPublicPage ||
    !projectSlug ||
    hasPageAccess(user.role, projectSlug);

  // Mark auth store as hydrated after mount (avoids React 19 state-update-before-mount warning)
  useEffect(() => {
    useAuthStore.getState().setHydrated(true);
    const unsubscribe = useAuthStore.getState().initAuth();
    return () => {
      unsubscribe();
    };
  }, []);

  // Fetch the active factory and preload filters whenever user is authenticated.
  useEffect(() => {
    if (user) {
      if (!factoryInitialized) {
        useFactoryStore.getState().fetchFactory();
      }
      if (!filtersInitialized) {
        useEntitiesStore.getState().preloadAllFilters({ silent: true });
      }
    }
  }, [user, factoryInitialized, filtersInitialized]);

  useEffect(() => {
    if (!authHydrated || !initialized || profileLoading) return;

    switch (true) {
      // 1. Unauthenticated users trying to access protected pages
      case !user && !isAuthPage && !isPublicPage: {
        router.push(getNextRedirectUrl(AppRoutes.LOGIN, pathname));
        break;
      }

      // 2. Authenticated users trying to access general auth pages
      case !!user && isAuthPage: {
        router.push(getNextParam() || AppRoutes.HOME);
        break;
      }

      default:
        break;
    }
  }, [
    user,
    authHydrated,
    initialized,
    profileLoading,
    isAuthPage,
    isPublicPage,
    pathname,
    projectSlug,
    isAuthorized,
    router,
  ]);

  // Public pages can render immediately without blocking on auth initialization or profile loading
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Show loading only during initial rehydration or while profile check is in-flight.
  // Factory and filter preloads happen in the background — components handle their own loading states.
  if (!authHydrated || !initialized || (profileLoading && !user)) {
    return <FullScreenStatus message="Booting up..." />;
  }

  if (!user && !isAuthPage && !isPublicPage) {
    return <FullScreenStatus message="Taking you places..." />;
  }

  if (user && isAuthPage) {
    return <FullScreenStatus message="Taking you places..." />;
  }

  if (user && projectSlug && !isAuthorized) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <NotFound />
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return <>{children}</>;
}
