"use client";

/**
 * @file components/projects/settings/settings-view.tsx
 * @description Dedicated, single-row form view for Factory Settings and weighment merge rules.
 */

import * as React from "react";
import { useAuthStore } from "@/lib/store";
import { Role, ProjectSlug } from "@/lib/constants/enums";
import { type Factory } from "@/types";
import { fetchEntityListFromApi, updateRow } from "@/lib/services/common";
import { formatDateTime } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Spinner } from "@/components/kibo-ui/spinner";
import { toast } from "sonner";
import {
  Factory as FactoryIcon,
  ShieldCheck,
  ShieldAlert,
  Save,
  RotateCcw,
  Loader2,
  Clock,
  Info,
} from "lucide-react";

interface SettingsViewProps {
  projectName?: string;
  desc?: string;
}

export function SettingsView({ desc }: SettingsViewProps) {
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === Role.ADMIN;

  const [factory, setFactory] = React.useState<Factory | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  // Form states
  const [name, setName] = React.useState("");
  const [checkCenterOnMerge, setCheckCenterOnMerge] = React.useState(false);
  const [receiptImagesPerRow, setReceiptImagesPerRow] = React.useState(3);

  const loadSettings = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await fetchEntityListFromApi<Factory>(ProjectSlug.SETTINGS);
      if (list && list.length > 0) {
        const item = list[0];
        setFactory(item);
        setName(item.name || "");
        setCheckCenterOnMerge(Boolean(item.check_center_on_merge));
        setReceiptImagesPerRow(item.receipt_images_per_row ?? 3);
        useAuthStore.getState?.().updateUser?.({
          factory_name: item.name,
          receipt_images_per_row: item.receipt_images_per_row ?? 3,
        });
      }
    } catch (err) {
      console.error("Failed to load factory settings:", err);
      toast.error("Failed to load factory settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const isDirty = React.useMemo(() => {
    if (!factory) return false;
    return (
      name.trim() !== (factory.name || "") ||
      checkCenterOnMerge !== Boolean(factory.check_center_on_merge) ||
      receiptImagesPerRow !== (factory.receipt_images_per_row ?? 3)
    );
  }, [factory, name, checkCenterOnMerge, receiptImagesPerRow]);

  const handleReset = () => {
    if (!factory) return;
    setName(factory.name || "");
    setCheckCenterOnMerge(Boolean(factory.check_center_on_merge));
    setReceiptImagesPerRow(factory.receipt_images_per_row ?? 3);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Only administrators have permission to modify factory settings.");
      return;
    }
    if (!factory) return;
    if (!name.trim()) {
      toast.error("Factory name cannot be empty.");
      return;
    }

    try {
      setIsSaving(true);
      const updated = (await updateRow(ProjectSlug.SETTINGS, factory.id, {
        name: name.trim(),
        check_center_on_merge: checkCenterOnMerge,
        receipt_images_per_row: receiptImagesPerRow,
      })) as unknown as Factory;

      setFactory(updated);
      setName(updated.name);
      setCheckCenterOnMerge(Boolean(updated.check_center_on_merge));
      setReceiptImagesPerRow(updated.receipt_images_per_row ?? 3);
      useAuthStore.getState?.().updateUser?.({
        factory_name: updated.name,
        receipt_images_per_row: updated.receipt_images_per_row ?? 3,
      });
      toast.success("Factory settings updated successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update factory settings.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3">
        <Spinner />
        <span className="text-xs font-medium text-muted-foreground/70">
          Loading factory settings...
        </span>
      </div>
    );
  }

  if (!factory) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-muted-foreground">No factory settings found.</p>
        <Button variant="outline" size="sm" onClick={loadSettings}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full my-auto">
      <div className="w-full max-w-2xl">
        {desc && <p className="text-xs text-muted-foreground mb-3 text-center">{desc}</p>}

        <Card className="border-border/70 shadow-xs">
          <CardHeader className="border-b border-border/60 py-3 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FactoryIcon className="h-4 w-4 text-primary" />
                Factory Settings
              </CardTitle>
              <CardDescription className="text-xs hidden sm:block">
                Manage factory identification and weighment behaviors.
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleSave}>
            <CardContent className="p-4 sm:p-5 space-y-3.5">
              {/* Row 1: Factory Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                <div>
                  <label
                    htmlFor="factory-name-input"
                    className="text-xs font-semibold text-foreground block"
                  >
                    Factory Name
                  </label>
                  <p className="text-2xs text-muted-foreground">
                    Official display name shown on weighment slips and reports.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Input
                    id="factory-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isAdmin || isSaving}
                    placeholder="e.g. Acme Processing Plant"
                    className="h-8.5 text-xs sm:text-sm"
                  />
                  {!isAdmin && (
                    <p className="text-2xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-1">
                      <ShieldAlert className="h-3 w-3 shrink-0" />
                      Only administrators have permission to modify the factory name.
                    </p>
                  )}
                </div>
              </div>

              <Separator className="my-0.5" />

              {/* Row 2: Check Center On Merge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Collection Center Scope
                  </span>
                  <p className="text-2xs text-muted-foreground">
                    Require tare and gross entries to originate from the same center.
                  </p>
                </div>
                <div className="sm:col-span-2 flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate">
                      Check Center on Entry Merge
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={checkCenterOnMerge ? "default" : "secondary"}
                      className="text-2xs px-1.5 py-0 h-4 font-normal"
                    >
                      {checkCenterOnMerge ? "Enabled" : "Disabled"}
                    </Badge>
                    <Switch
                      id="check-center-on-merge-switch"
                      checked={checkCenterOnMerge}
                      onCheckedChange={setCheckCenterOnMerge}
                      disabled={!isAdmin || isSaving}
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-0.5" />

              {/* Row 3: Receipt Images Per Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Weighment Receipt Layout
                  </span>
                  <p className="text-2xs text-muted-foreground">
                    Camera images shown per row on receipts and PDF reports.
                  </p>
                </div>
                <div className="sm:col-span-2 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        id={`receipt-images-per-row-${n}`}
                        disabled={!isAdmin || isSaving}
                        onClick={() => setReceiptImagesPerRow(n)}
                        className={[
                          "h-8 w-10 rounded-md border text-xs font-semibold transition-all",
                          receiptImagesPerRow === n
                            ? "border-primary bg-primary/10 text-primary shadow-xs"
                            : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                          !isAdmin || isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                        ].join(" ")}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <span className="text-2xs text-muted-foreground shrink-0">
                    <span className="font-semibold text-foreground">{receiptImagesPerRow}</span> per
                    row
                  </span>
                  {!isAdmin && (
                    <p className="text-2xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 w-full pt-1">
                      <ShieldAlert className="h-3 w-3 shrink-0" />
                      Only administrators have permission to modify this setting.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-5 py-2.5">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                  <span className="text-2xs sm:text-xs">
                    Last updated {formatDateTime(factory.updated_at)}
                  </span>
                </div>
                {isDirty && (
                  <Badge
                    variant="outline"
                    className="text-2xs border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 px-1.5 py-0 h-4"
                  >
                    Unsaved changes
                  </Badge>
                )}
              </div>

              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={!isDirty || isSaving}
                    className="gap-1.5 h-7.5 px-2.5 text-xs"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!isDirty || isSaving || !name.trim()}
                    className="gap-1.5 h-7.5 px-2.5 text-xs shadow-xs"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    Save Changes
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 text-blue-500" />
                  <span>View-only mode (Admin required to modify)</span>
                </div>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
