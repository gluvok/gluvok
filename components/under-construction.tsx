"use client";

/**
 * @file components/under-construction.tsx
 * @description Reusable "Under Construction" page wrapper for pending platform routes.
 */

import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Construction, Clock, ArrowLeft, Layers, type LucideIcon } from "lucide-react";
import { jakarta, inter } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { AppRoutes } from "@/lib/constants";

interface UnderConstructionPageProps {
  title: string;
  breadcrumbTitle: string;
  description: string;
  icon: LucideIcon;
  triggerId: string;
}

export function UnderConstructionPage({
  title,
  breadcrumbTitle,
  description,
  icon: PageIcon,
  triggerId,
}: UnderConstructionPageProps) {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger id={triggerId} className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1.5 font-medium">
                <PageIcon className="h-3.5 w-3.5" />
                {breadcrumbTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center overflow-hidden">
        <div className="max-w-md space-y-6 flex flex-col items-center">
          {/* Glowing Icon Container */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border bg-muted/50 shadow-sm">
            <PageIcon className="h-10 w-10 text-primary animate-pulse" />
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-amber-950 border-2 border-background shadow-xs">
              <Construction className="h-4 w-4" />
            </div>
          </div>

          {/* Under Construction Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Under Construction</span>
          </div>

          {/* Heading & Subtext */}
          <div className="space-y-2">
            <h1
              className={cn(
                jakarta.className,
                "text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl",
              )}
            >
              {title}
            </h1>
            <p className={cn(inter.className, "text-sm text-muted-foreground leading-relaxed")}>
              {description}
            </p>
          </div>

          {/* Action Links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full">
            <Button asChild variant="default" size="sm" className="gap-2 w-full sm:w-auto">
              <Link href={AppRoutes.SERVICES}>
                <Layers className="h-4 w-4" />
                View Services & Docs
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
              <Link href={AppRoutes.HOME}>
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
