"use client";

/**
 * @file components/projects/settings-summary.tsx
 * @description Single-record settings summary with contextual edit actions.
 */

import * as React from "react";
import { Pencil, Plus, RotateCw, Fingerprint, ShieldCheck, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/kibo-ui/spinner";
import { getFieldRequirementModeLabel, getModeColorClass, getModeIcon } from "@/lib/fields";
import { FieldRequirementMode } from "@/lib/constants/enums";
import { type Settings, type EntityRecord } from "@/types";

interface SettingsSummaryProps {
  settings?: Settings;
  isLoading: boolean;
  error?: string | null;
  canCreate: boolean;
  canEdit: boolean;
  onCreate: () => void;
  onEdit: (settings: EntityRecord) => void;
  onRetry: () => void;
}

interface SettingsFieldProps {
  label: string;
  mode: FieldRequirementMode;
  icon: React.ComponentType<{ className?: string }>;
}

function SettingsField({ label, mode, icon: Icon }: SettingsFieldProps) {
  const modeIcon = React.createElement(getModeIcon(mode), {
    className: "h-3.5 w-3.5",
  });

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold ${getModeColorClass(mode)}`}
      >
        {modeIcon}
        {getFieldRequirementModeLabel(mode)}
      </span>
    </div>
  );
}

/** Displays the single configuration record for the active tenant scope. */
export function SettingsSummary({
  settings,
  isLoading,
  error,
  canCreate,
  canEdit,
  onCreate,
  onEdit,
  onRetry,
}: SettingsSummaryProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button onClick={onRetry} size="sm" variant="outline" className="gap-1.5">
          <RotateCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">No settings have been created yet.</p>
        {canCreate && (
          <Button onClick={onCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add settings
          </Button>
        )}
      </div>
    );
  }

  const factoryName = String(settings.name || settings.factory_name || "Factory");
  const aadharNumberMode = settings.aadhar_number_mode ?? FieldRequirementMode.MANDATORY;
  const govtIdMode = settings.govt_id_mode ?? FieldRequirementMode.MANDATORY;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-2 mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
          <Building className="h-4 w-4" />
          <span>{factoryName}</span>
        </div>
        <CardTitle>Identification requirements</CardTitle>
        <CardDescription>
          Manage identification requirement settings for {factoryName}.
        </CardDescription>
        {canEdit && (
          <CardAction>
            <Button
              onClick={() => onEdit(settings)}
              size="sm"
              variant="outline"
              className="gap-1.5"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <SettingsField label="Aadhar number" mode={aadharNumberMode} icon={Fingerprint} />
        <SettingsField label="Government ID" mode={govtIdMode} icon={ShieldCheck} />
      </CardContent>
    </Card>
  );
}
