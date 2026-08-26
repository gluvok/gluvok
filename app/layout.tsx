/**
 * @file app/layout.tsx
 * @description The root layout for the gluvok application.
 * Manages global styles, fonts, page structures, global layouts, tooltips, and toast notifications.
 */

import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";
import { cn } from "@/lib/utils";
import { MainLayout } from "@/components/layout-wrapper";
import { geist, outfit } from "@/lib/fonts";

/**
 * Root metadata settings for SEO and browser representation.
 */
export const metadata: Metadata = {
  title: "gluvok Dashboard | Platform Operations",
  description:
    "Access the gluvok platform tools, manage entities, configure visibility settings, and track operations.",
  icons: {
    icon: "/logo.png",
  },
};

/**
 * RootLayout Component
 * Wraps all application views inside common layout containers, tooltip configurations,
 * and toast notification handlers (Toaster).
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", geist.className)}>
      <body className="min-h-full flex flex-col antialiased">
        <TooltipProvider>
          {/* MainLayout handles sidebar and general content structures */}
          <MainLayout>{children}</MainLayout>
        </TooltipProvider>
        {/* Global toast notification system wrapper */}
        <Toaster
          position="top-right"
          expand={true}
          richColors
          closeButton
          toastOptions={{
            className: outfit.className,
          }}
        />
      </body>
    </html>
  );
}
