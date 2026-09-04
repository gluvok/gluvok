import React from "react";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { jakarta, inter } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { type ServiceCardProps } from "./services-data";

const cardContainerStyles =
  "relative flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1";
const badgeBaseStyles =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider w-fit shadow-sm";
const iconWrapperBase =
  "flex shrink-0 items-center justify-center text-primary border border-primary/20";
const serviceIconWrapper = cn(iconWrapperBase, "h-10 w-10 rounded-lg");
const featureIconWrapper =
  "flex shrink-0 items-center justify-center h-5 w-5 rounded mt-0.5 text-muted-foreground";

export function ServiceCard({
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
        <div className={cn(badgeBaseStyles, badgeBgClass)}>
          {badgeIcon}
          <span>{badgeText}</span>
        </div>

        <div className="flex items-center gap-3 mt-1">
          <div className={serviceIconWrapper}>{icon}</div>
          <h2 className={cn(jakarta.className, "text-lg font-bold leading-snug text-foreground")}>
            {title}
          </h2>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed hyphens-auto">{description}</p>

      <ul className="space-y-3 my-2">
        {features.map((f, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground">
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
