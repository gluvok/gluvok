"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Copy01Icon,
  Image01Icon,
  SecurityCheckIcon,
  TruckIcon,
  UserIcon,
  WeightScale01Icon,
} from "@hugeicons/core-free-icons";
import { RoleBadge } from "@/components/role-badge";
import type { UserRole } from "@/app/users/types";
import { type Entry } from "./types";

interface EntryDetailSheetProps {
  entry: Entry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EntryDetailSheet({ entry, open, onOpenChange }: EntryDetailSheetProps) {
  if (!entry) return null;

  const isAnprMatch =
    entry.detected_vehicle_number &&
    entry.detected_vehicle_number.trim().toUpperCase() ===
      entry.vehicle_number.trim().toUpperCase();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.add({
      type: "success",
      title: "Copied to Clipboard",
      description: `${label} copied.`,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HugeiconsIcon icon={TruckIcon} className="size-4" />
            </div>
            <div>
              <SheetTitle className="font-mono text-base font-bold">
                {entry.vehicle_number}
              </SheetTitle>
              <SheetDescription className="text-2xs text-muted-foreground">
                Scale Entry #{entry.id}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-5 py-4">
          {/* Vehicle & ANPR Card */}
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Confirmed Plate</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-foreground">{entry.vehicle_number}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleCopy(entry.vehicle_number, "Vehicle Number")}
                  className="size-5"
                >
                  <HugeiconsIcon icon={Copy01Icon} className="size-3" />
                  <span className="sr-only">Copy vehicle number</span>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">ANPR Detected Plate</span>
              <span className="font-mono text-foreground">
                {entry.detected_vehicle_number || "None"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/40">
              <span className="text-muted-foreground">Recognition Status</span>
              {entry.detected_vehicle_number ? (
                isAnprMatch ? (
                  <Badge
                    variant="outline"
                    className="text-2xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1"
                  >
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3" />
                    Matched
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-2xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  >
                    Discrepancy
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="text-2xs text-muted-foreground">
                  Manual Entry
                </Badge>
              )}
            </div>
          </div>

          {/* Scale Weight Measurement */}
          <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HugeiconsIcon icon={WeightScale01Icon} className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xs uppercase tracking-wider font-semibold text-primary">
                  Measured Scale Weight
                </span>
                <span className="text-xl font-bold font-mono text-foreground">
                  {Number(entry.weight).toLocaleString()}{" "}
                  <span className="text-xs font-normal text-muted-foreground">kg</span>
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(String(entry.weight), "Weight")}
              className="text-xs gap-1"
            >
              <HugeiconsIcon icon={Copy01Icon} className="size-3" data-icon="inline-start" />
              Copy
            </Button>
          </div>

          {/* Operational Associations */}
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <HugeiconsIcon icon={Building01Icon} className="size-3.5" />
                <span>Processing Center</span>
              </span>
              <span className="font-medium text-foreground">
                {entry.center?.name || `Center #${entry.center_id}`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <HugeiconsIcon icon={UserIcon} className="size-3.5" />
                <span>Assigned Customer</span>
              </span>
              <span className="font-medium text-foreground">
                {entry.customer?.name || (
                  <span className="text-muted-foreground italic">Unassigned</span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <HugeiconsIcon icon={SecurityCheckIcon} className="size-3.5" />
                <span>Entry Source</span>
              </span>
              {entry.created_by_user?.role === "hardware" ? (
                <Badge
                  variant="outline"
                  className="gap-1 text-2xs font-medium border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                >
                  <HugeiconsIcon icon={SecurityCheckIcon} className="size-3" />
                  Hardware
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 text-2xs font-medium border-stone-500/20 bg-stone-500/10 text-stone-600 dark:text-stone-400"
                >
                  <HugeiconsIcon icon={UserIcon} className="size-3" />
                  Manual
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <HugeiconsIcon icon={UserIcon} className="size-3.5" />
                <span>Created By</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">
                  {entry.created_by_user?.name || `User #${entry.created_by}`}
                </span>
                {entry.created_by_user?.role && (
                  <RoleBadge role={entry.created_by_user.role as UserRole} />
                )}
              </div>
            </div>
          </div>

          {/* Photos Snapshot Gallery */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <HugeiconsIcon icon={Image01Icon} className="size-3.5 text-muted-foreground" />
              <span>Scale Snapshot Photos ({entry.images?.length ?? 0})</span>
            </span>

            {entry.images && entry.images.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {entry.images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-md border bg-muted overflow-hidden aspect-video"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Snapshot ${idx + 1}`} className="size-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-dashed bg-muted/20 text-muted-foreground text-center">
                <HugeiconsIcon icon={Image01Icon} className="size-6 mb-1 opacity-50" />
                <span className="text-xs">No snapshot photos attached to this entry</span>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                <HugeiconsIcon icon={Calendar01Icon} className="size-3" />
                <span>Captured At</span>
              </span>
              <span className="text-foreground">{formatDateTime(entry.created_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                <HugeiconsIcon icon={Clock01Icon} className="size-3" />
                <span>Last Updated</span>
              </span>
              <span className="text-foreground">{formatDateTime(entry.updated_at)}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
