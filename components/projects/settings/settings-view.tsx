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

  const loadSettings = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await fetchEntityListFromApi<Factory>(ProjectSlug.SETTINGS);
      if (list && list.length > 0) {
        const item = list[0];
        setFactory(item);
        setName(item.name || "");
        setCheckCenterOnMerge(Boolean(item.check_center_on_merge));
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
      checkCenterOnMerge !== Boolean(factory.check_center_on_merge)
    );
  }, [factory, name, checkCenterOnMerge]);

  const handleReset = () => {
    if (!factory) return;
    setName(factory.name || "");
    setCheckCenterOnMerge(Boolean(factory.check_center_on_merge));
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
      })) as unknown as Factory;

      setFactory(updated);
      setName(updated.name);
      setCheckCenterOnMerge(Boolean(updated.check_center_on_merge));
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
      <div className="min-h-96 flex flex-col items-center justify-center gap-3">
        <Spinner />
        <span className="text-xs font-medium text-muted-foreground/70">
          Loading factory settings...
        </span>
      </div>
    );
  }

  if (!factory) {
    return (
      <div className="min-h-96 flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-muted-foreground">No factory settings found.</p>
        <Button variant="outline" size="sm" onClick={loadSettings}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] w-full py-6">
      <div className="w-full max-w-2xl space-y-4">
        {desc && <p className="text-xs text-muted-foreground text-center">{desc}</p>}

        <Card className="border-border/70 shadow-xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FactoryIcon className="h-4.5 w-4.5 text-primary" />
              Factory Settings
            </CardTitle>
            <CardDescription className="text-xs">
              Manage factory identification and automated entry merging behavior.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSave}>
            <CardContent className="p-6 space-y-6">
              {/* Row 1: Factory Name */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="space-y-1">
                  <label
                    htmlFor="factory-name-input"
                    className="text-xs font-semibold text-foreground block"
                  >
                    Factory Name
                  </label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Official display name shown on weighment slips and PDF export reports.
                  </p>
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Input
                    id="factory-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isAdmin || isSaving}
                    placeholder="e.g. Acme Processing Plant"
                    className="h-9 text-sm"
                  />
                  {!isAdmin && (
                    <p className="text-2xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-0.5">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      Only administrators have permission to modify the factory name.
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Row 2: Check Center On Merge */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-foreground block">
                    Collection Center Scope
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Controls whether automated weighment pairing checks collection centers.
                  </p>
                </div>
                <div className="md:col-span-2 flex items-start justify-between gap-4 p-3.5 rounded-lg border border-border/60 bg-muted/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs font-medium text-foreground">
                        Check Center on Entry Merge
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      When enabled, tare and gross entries must originate from the same collection
                      center to merge. When disabled, entries are merged factory-wide regardless of
                      center.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 mt-0.5">
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
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-6 py-3">
              <div className="text-xs text-muted-foreground flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                  <span>Last updated {formatDateTime(factory.updated_at)}</span>
                </div>
                {isDirty && (
                  <Badge
                    variant="outline"
                    className="text-2xs border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
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
                    className="gap-1.5 h-8 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!isDirty || isSaving || !name.trim()}
                    className="gap-1.5 h-8 text-xs shadow-xs"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
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
