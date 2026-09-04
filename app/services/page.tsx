"use client";

/**
 * @file app/services/page.tsx
 * @description Services overview page explaining client deployment and integration models.
 */

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Layers, SlidersHorizontal, Sparkles, Compass, HelpCircle } from "lucide-react";
import { jakarta, inter } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { SERVICES } from "./services-data";
import { ServiceCard } from "./service-card";

const capabilityCardStyles =
  "flex items-start gap-3.5 p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-200";
const capabilityTitleStyles = cn(jakarta.className, "text-sm font-bold text-foreground");
const capabilityDescStyles = cn(
  inter.className,
  "text-xs text-muted-foreground leading-relaxed hyphens-auto",
);
const iconWrapperBase =
  "flex shrink-0 items-center justify-center text-primary border border-primary/20";
const capabilityIconWrapper = cn(iconWrapperBase, "h-8 w-8 rounded-lg");

export default function ServicesPage() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger id="sidebar-trigger-services" className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1.5 font-medium">
                  <Layers className="h-3.5 w-3.5" />
                  Services
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <main className="p-8 w-full min-w-0 space-y-8">
        {/* Split Section Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-stretch rounded-2xl border bg-linear-to-br from-muted/40 via-muted/20 to-background p-6 md:p-8">
          <div className="flex flex-col justify-center space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-semibold text-primary w-fit shadow-sm">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Deployment Options</span>
            </div>
            <div className="space-y-2.5">
              <h1
                className={cn(
                  jakarta.className,
                  "text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5",
                )}
              >
                <Compass className="h-7 w-7 text-primary/80 shrink-0" />
                How We Work With You
              </h1>
              <p
                className={cn(
                  inter.className,
                  "text-muted-foreground text-sm leading-relaxed max-w-xl hyphens-auto",
                )}
              >
                Choose the deployment model that fits your team. Whether you own your
                infrastructure, want us to handle everything, or need a self-hosted setup — we have
                an option for you.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center space-y-4 border-t pt-6 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-8 border-border">
            <h2
              className={cn(
                jakarta.className,
                "text-xs font-bold uppercase tracking-wider text-muted-foreground",
              )}
            >
              Standard Capabilities Across All Models
            </h2>
            <div className="grid grid-cols-1">
              <div className={capabilityCardStyles}>
                <div className={capabilityIconWrapper}>
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <h3 className={capabilityTitleStyles}>Granular Fields</h3>
                  <p className={capabilityDescStyles}>
                    Hide specific fields per entity (e.g., exclude govt_id for customers so it
                    won&apos;t appear).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, idx) => (
            <div key={idx} className={idx === 2 ? "md:col-span-2 lg:col-span-1" : ""}>
              <ServiceCard {...service} />
            </div>
          ))}
        </div>

        <div className="flex items-start gap-3 rounded-xl border bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className={inter.className}>
            Not sure which model is right for you? Reach out via{" "}
            <strong className="text-foreground">Support</strong> and our team will help you decide
            based on your infrastructure and scale requirements.
          </p>
        </div>
      </main>
    </>
  );
}
