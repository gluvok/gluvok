"use client"

/**
 * @file components/projects/config-summary.tsx
 * @description Single-record configuration summary with contextual create and edit actions.
 */

import * as React from "react";
import { Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/kibo-ui/spinner"
import { getFieldRequirementModeLabel, getModeColorClass, getModeIcon } from "@/lib/fields"
import { EntityKey, FieldRequirementMode } from "@/lib/constants/enums"
import { type Config, type EntityRecord } from "@/types"

interface ConfigSummaryProps {
  config?: Config
  isLoading: boolean
  canCreate: boolean
  canEdit: boolean
  onCreate: () => void
  onEdit: (config: EntityRecord) => void
}

interface ConfigSettingProps {
  label: string
  mode: FieldRequirementMode
}

function ConfigSetting({ label, mode }: ConfigSettingProps) {
  const modeIcon = React.createElement(getModeIcon(mode), {
    className: "h-3.5 w-3.5",
  });

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-2">
      <span className="text-xs font-medium text-foreground">{label}</span>
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
export function ConfigSummary({ config, isLoading, canCreate, canEdit, onCreate, onEdit }: ConfigSummaryProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">No configuration has been created yet.</p>
        {canCreate && (
          <Button onClick={onCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add configuration
          </Button>
        )}
      </div>
    )
  }

  const aadharNumberMode = config[EntityKey.AADHAR_NUMBER_MODE] ?? FieldRequirementMode.MANDATORY
  const govtIdMode = config[EntityKey.GOVT_ID_MODE] ?? FieldRequirementMode.MANDATORY

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Identification requirements</CardTitle>
        <CardDescription>
          Manage which identification details are collected for this tenant.
        </CardDescription>
        {canEdit && (
          <CardAction>
            <Button
              onClick={() => onEdit(config)}
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
        <ConfigSetting label="Aadhar number" mode={aadharNumberMode} />
        <ConfigSetting label="Government ID" mode={govtIdMode} />
      </CardContent>
    </Card>
  );
}
