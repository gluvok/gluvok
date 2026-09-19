"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Home",
  "/centers": "Centers",
  "/entries": "Entries",
  "/weighments": "Weighments",
  "/customers": "Customers",
  "/users": "Users",
  "/settings": "Settings",
  "/tickets": "Tickets",
  "/support": "Support",
  "/services": "Services",
};

export function AppBreadcrumb({ className, ...props }: React.ComponentProps<"span">) {
  const pathname = usePathname();
  const title = (pathname && ROUTE_TITLES[pathname]) || "Home";

  return (
    <span className={cn("text-sm font-medium", className)} {...props}>
      {title}
    </span>
  );
}
