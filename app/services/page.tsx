"use client"

/**
 * @file app/services/page.tsx
 * @description Services overview page.
 * Explains the three deployment and integration models offered to clients.
 */

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Layers,
  Database,
  Server,
  Cloud,
  ShieldAlert,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  SlidersHorizontal,
  Sparkles,
  Link,
  TrendingUp,
  Zap,
  Clock,
  Box,
  Lock,
  Cpu,
  Compass,
  HelpCircle,
  CheckCircle2,
  Settings,
  Shield,
} from "lucide-react"
import { jakarta, inter } from "@/lib/fonts"
import { cn } from "@/lib/utils"

// Consolidated styles using the cn utility function
const cardContainerStyles = "relative flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1"
const badgeBaseStyles = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider w-fit shadow-sm"

// Icon wrappers — service/capability keep border, feature list icons are borderless
const iconWrapperBase = "flex shrink-0 items-center justify-center text-primary border border-primary/20"
const serviceIconWrapper = cn(iconWrapperBase, "h-10 w-10 rounded-lg")
const featureIconWrapper = "flex shrink-0 items-center justify-center h-5 w-5 rounded mt-0.5 text-muted-foreground"
const capabilityIconWrapper = cn(iconWrapperBase, "h-8 w-8 rounded-lg")

// Capability card styles
const capabilityCardStyles = "flex items-start gap-3.5 p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-200"
const capabilityTitleStyles = cn(jakarta.className, "text-sm font-bold text-foreground")
const capabilityDescStyles = cn(inter.className, "text-xs text-muted-foreground leading-relaxed hyphens-auto")

// Icon size shorthands reused inside SERVICES data
const serviceIconCls = "h-5 w-5"
const featureIconCls = "h-3 w-3"
const badgeIconCls = "h-3 w-3"

// Helpers to build the per-card accent border and badge background from a single color token
const accentBorder = (color: string) => {
  switch (color) {
    case "blue":
      return "border-t-2 border-t-blue-500 dark:border-t-blue-600"
    case "emerald":
      return "border-t-2 border-t-emerald-500 dark:border-t-emerald-600"
    case "indigo":
      return "border-t-2 border-t-indigo-500 dark:border-t-indigo-600"
    default:
      return ""
  }
}

const badgeBg = (color: string) => {
  switch (color) {
    case "blue":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
    case "emerald":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
    case "indigo":
      return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20"
    default:
      return ""
  }
}

interface FeatureItem {
  text: string
  icon: React.ReactNode
}

interface ServiceCardProps {
  icon: React.ReactNode
  title: string
  description: string
  features: FeatureItem[]
  caveat?: string
  caveatType?: "warning" | "danger"
  successNote?: string
  accentClass: string
  badgeText: string
  badgeIcon: React.ReactNode
  badgeBgClass: string
}

function ServiceCard({
  icon,
  title,
  description,
  features,
  caveat,
  caveatType = "danger",
  successNote,
  accentClass,
  badgeText,
  badgeIcon,
  badgeBgClass,
}: ServiceCardProps) {
  return (
    <div className={cn(cardContainerStyles, accentClass, inter.className)}>
      <div className="flex flex-col gap-3">
        {/* Category/Status Badge */}
        <div className={cn(badgeBaseStyles, badgeBgClass)}>
          {badgeIcon}
          <span>{badgeText}</span>
        </div>

        <div className="flex items-center gap-3 mt-1">
          <div className={serviceIconWrapper}>{icon}</div>
          <h2
            className={cn(
              jakarta.className,
              "text-lg font-bold leading-snug text-foreground",
            )}
          >
            {title}
          </h2>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed hyphens-auto">
        {description}
      </p>

      <ul className="space-y-3 my-2">
        {features.map((f, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2.5 text-sm text-foreground"
          >
            <span className={featureIconWrapper}>{f.icon}</span>
            <span className="leading-relaxed">{f.text}</span>
          </li>
        ))}
      </ul>

      {caveat && (
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-lg border px-4 py-3 mt-auto transition-colors",
            caveatType === "warning"
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-destructive/30 bg-destructive/5",
          )}
        >
          {caveatType === "warning" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
          ) : (
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          )}
          <p
            className={cn(
              "text-xs leading-relaxed hyphens-auto",
              caveatType === "warning"
                ? "text-amber-800 dark:text-amber-300"
                : "text-destructive/90",
            )}
          >
            {caveat}
          </p>
        </div>
      )}

      {successNote && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 mt-auto">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-xs leading-relaxed hyphens-auto text-emerald-700 dark:text-emerald-400">
            {successNote}
          </p>
        </div>
      )}
    </div>
  );
}

const SERVICES: ServiceCardProps[] = [
  {
    title: "Bring Your Own Database and/or Object Storage",
    icon: <Database className={serviceIconCls} />,
    description:
      "Connect your database to our platform via our custom backend integration layer. Enjoy granular control over your fields and tables while keeping full ownership of your data hosting and performance management.",
    features: [
      { text: "Integrate your database directly into our backend platform.", icon: <Link      className={featureIconCls} /> },
      { text: "Support custom storage buckets or use managed storage.",      icon: <HardDrive  className={featureIconCls} /> },
      { text: "Retain complete control over scaling performance.",            icon: <TrendingUp className={featureIconCls} /> },
    ],
    caveat:
      "Your database health is your responsibility. Any service interruptions, slow queries, or data issues resulting from your database performance are not covered by our platform support.",
    caveatType: "warning",
    accentClass: accentBorder("blue"),
    badgeText: "Flexible Control",
    badgeIcon: <Settings className={badgeIconCls} />,
    badgeBgClass: badgeBg("blue"),
  },
  {
    title: "Everything Fully Managed And Coordinated By Us",
    icon: <Cloud className={serviceIconCls} />,
    description:
      "Let us handle the infrastructure, from databases and server hosting to object storage setups. Get started instantly without DevOps overhead, while choosing how your tables and fields are structured.",
    features: [
      { text: "Host your database and backend server within our systems.", icon: <Cpu   className={featureIconCls} /> },
      { text: "Deploy instantly without server setup or maintenance.",      icon: <Zap   className={featureIconCls} /> },
      { text: "Guarantee high availability with system updates.",           icon: <Clock className={featureIconCls} /> },
    ],
    successNote:
      "We take full responsibility for database scaling, performance, security, and backups. Enjoy complete peace of mind with our fully monitored, highly available, and updated hosting services.",
    accentClass: accentBorder("emerald"),
    badgeText: "Zero DevOps",
    badgeIcon: <CheckCircle2 className={badgeIconCls} />,
    badgeBgClass: badgeBg("emerald"),
  },
  {
    title: "Bring Your Own Private Application Server Host",
    icon: <Server className={serviceIconCls} />,
    description:
      "Host frontend and backend on your server using private Docker images with your database. Keep full deployment privacy and control without accessing the underlying business logic source code.",
    features: [
      { text: "Deploy our Docker containers directly on local servers.",    icon: <Box      className={featureIconCls} /> },
      { text: "Connect to either our storage or your storage bucket.",      icon: <HardDrive className={featureIconCls} /> },
      { text: "Isolate application traffic within local networks.",         icon: <Lock     className={featureIconCls} /> },
    ],
    caveat:
      "Any server crashes, hardware bottlenecks, or configuration errors arising from your self-hosted infrastructure are your sole responsibility. We do not provide server maintenance.",
    accentClass: accentBorder("indigo"),
    badgeText: "Maximum Privacy",
    badgeIcon: <Shield className={badgeIconCls} />,
    badgeBgClass: badgeBg("indigo"),
  },
]

export default function ServicesPage() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger id="sidebar-trigger-services" className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
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
          {/* Left Column - Intro copy explaining deployment models */}
          <div className="flex flex-col justify-center space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-semibold text-primary w-fit shadow-sm">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Deployment Options</span>
            </div>
            <div className="space-y-2.5">
              <h1 className={cn(jakarta.className, "text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5")}>
                <Compass className="h-7 w-7 text-primary/80 shrink-0" />
                How We Work With You
              </h1>
              <p className={cn(inter.className, "text-muted-foreground text-sm leading-relaxed max-w-xl hyphens-auto")}>
                Choose the deployment model that fits your team. Whether you own your infrastructure, want us to handle
                everything, or need a self-hosted setup — we have an option for you.
              </p>
            </div>
          </div>

          {/* Right Column - Highlight box explaining the two common features */}
          <div className="flex flex-col justify-center space-y-4 border-t pt-6 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-8 border-border">
            <h2 className={cn(jakarta.className, "text-xs font-bold uppercase tracking-wider text-muted-foreground")}>
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
                    Hide specific fields per entity (e.g., exclude govt_id for customers so it won&apos;t appear).
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
            Not sure which model is right for you? Reach out via <strong className="text-foreground">Support</strong> and
            our team will help you decide based on your infrastructure and scale requirements.
          </p>
        </div>
      </main>
    </>
  )
}
