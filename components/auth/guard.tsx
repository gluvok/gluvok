"use client";

/**
 * @file components/auth/guard.tsx
 * @description Authentication and authorization guard wrapper.
 * Protects client routes and redirects unauthenticated or unauthorized users appropriately.
 */

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore, hasPageAccess } from "@/lib/store";
import { AppRoutes, AUTH_ROUTES, PUBLIC_ROUTES } from "@/lib/constants";
import NotFound from "@/app/not-found";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar";
import { getNextParam, getNextRedirectUrl } from "@/lib/utils";

/**
 * FullScreenStatus Component
 * Displays a minimal, centered loading or redirecting message covering the viewport.
 */
function FullScreenStatus({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-xs font-mono text-muted-foreground">
      {message}
    </div>
  );
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
  const userLoading = useAuthStore((state) => state.userLoading);

  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage = AUTH_ROUTES.includes(pathname);
  const isPublicPage = PUBLIC_ROUTES.includes(pathname);
  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectSlug = projectMatch ? projectMatch[1] : null;

  const isAuthorized =
    !user || isPublicPage || !projectSlug || hasPageAccess(user.role, projectSlug);

  // Mark auth store as hydrated after mount
  useEffect(() => {
    useAuthStore.getState().setHydrated(true);
    if (isAuthPage && typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has("reason")) {
        useAuthStore.getState().clearSession();
      }
    }
    const unsubscribe = useAuthStore.getState().initAuth();
    return () => {
      unsubscribe();
    };
  }, [isAuthPage]);

  useEffect(() => {
    if (!authHydrated || !initialized || userLoading) return;

    const hasSessionReason =
      isAuthPage &&
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("reason");

    switch (true) {
      // 1. Unauthenticated users trying to access protected pages
      case !user && !isAuthPage && !isPublicPage: {
        window.location.href = getNextRedirectUrl(AppRoutes.LOGIN, pathname);
        break;
      }

      // 2. Authenticated users trying to access general auth pages
      case !!user && isAuthPage: {
        if (hasSessionReason) {
          useAuthStore.getState().clearSession();
          break;
        }
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
    userLoading,
    isAuthPage,
    isPublicPage,
    pathname,
    projectSlug,
    isAuthorized,
    router,
  ]);

  // Public pages can render immediately without blocking on auth initialization or user loading
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Show loading only during initial rehydration or while user check is in-flight.
  if (!authHydrated || !initialized || (userLoading && !user)) {
    return <FullScreenStatus message="Booting up..." />;
  }

  const hasSessionReason =
    isAuthPage &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("reason");

  if (!user && !isAuthPage && !isPublicPage) {
    return <FullScreenStatus message="Taking you places..." />;
  }

  if (user && isAuthPage && !hasSessionReason) {
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
