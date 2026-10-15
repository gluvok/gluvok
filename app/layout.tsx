import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { Toaster } from "@/components/ui/toast";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
});

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gluvok",
  description: "Gluvok Management Platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        manrope.variable,
        "smooth-scroll",
      )}
    >
      <body className="min-h-full flex flex-col">
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar />
          <SidebarInset className="min-w-0 overflow-x-hidden">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 my-auto data-vertical:h-4" />
                <AppBreadcrumb />
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 min-w-0">{children}</div>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
