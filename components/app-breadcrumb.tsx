"use client";

import type { ComponentProps } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import { getRouteTitle } from "@/lib/navigation";

export function AppBreadcrumb({ className, ...props }: ComponentProps<"span">) {
  const pathname = usePathname();
  const title = getRouteTitle(pathname);

  return (
    <span className={cn("text-sm font-medium", className)} {...props}>
      {title}
    </span>
  );
}
