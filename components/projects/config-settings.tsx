"use client"

/**
 * @file components/projects/config-settings.tsx
 * @description Dedicated single-page configuration form view for managing Factory Config settings.
 */

import * as React from "react"
import { toast } from "sonner"
import { SlidersHorizontal, Fingerprint, ShieldCheck, Save, Loader2, Factory } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ModeCombobox, EntityCombobox } from "@/components/combobox"
import { useConfigStore, useAuthStore, type FactoryConfig } from "@/lib/store"
import { FieldRequirementMode, Role, ApiRoutes } from "@/lib/constants/enums"
import axios from "axios"

interface ConfigFormContentProps {
  initialConfig: FactoryConfig | null
  initialFactoryId: string
  isSuperAdmin: boolean
  onFactoryChange: (factoryIdStr: string) => void
  isLoadingConfig: boolean
}

function ConfigFormContent({
  initialConfig,
  initialFactoryId,
  isSuperAdmin,
  onFactoryChange,
  isLoadingConfig,
}: ConfigFormContentProps) {
  const setConfig = useConfigStore((state) => state.setConfig)

  const [selectedFactoryId, setSelectedFactoryId] = React.useState<string>(initialFactoryId)
  const [aadharMode, setAadharMode] = React.useState<string>(
    initialConfig?.aadharNumberMode || FieldRequirementMode.OPTIONAL
  )
  const [govtIdMode, setGovtIdMode] = React.useState<string>(
    initialConfig?.govtIdMode || FieldRequirementMode.OPTIONAL
  )
  const [isSaving, setIsSaving] = React.useState(false)

  const isUnchanged =
    aadharMode === (initialConfig?.aadharNumberMode || FieldRequirementMode.OPTIONAL) &&
    govtIdMode === (initialConfig?.govtIdMode || FieldRequirementMode.OPTIONAL) &&
    selectedFactoryId === initialFactoryId

  const handleSave = async () => {
    if (isUnchanged) {
      toast.info("No changes to save")
      return
    }
    setIsSaving(true)
    try {
      const payload = {
        factory_id: selectedFactoryId ? Number(selectedFactoryId) : 0,
        aadhar_number_mode: aadharMode,
        govt_id_mode: govtIdMode,
      }

      const res = await axios.post<{ data: { factory_id: number; aadhar_number_mode: FieldRequirementMode; govt_id_mode: FieldRequirementMode } }>(
        ApiRoutes.CONFIGS,
        payload
      )

      if (res.data?.data) {
        const updated = res.data.data
        const newConfigObj = {
          factoryId: updated.factory_id,
          aadharNumberMode: updated.aadhar_number_mode,
          govtIdMode: updated.govt_id_mode,
        }
        setConfig(newConfigObj)
        toast.success("Factory configuration updated successfully")
      }
    } catch (err) {
      console.error("Save config error:", err)
      toast.error("Failed to save configuration")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <CardContent className="space-y-6 pt-2">
      {/* Factory Selector for Super Admin */}
      {isSuperAdmin && (
        <div className="space-y-2 p-3.5 bg-muted/30 border rounded-xl">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Factory className="h-3.5 w-3.5 text-muted-foreground" />
            Target Factory
          </label>
          <EntityCombobox
            entitySlug="factories"
            value={selectedFactoryId}
            onChange={(val) => {
              setSelectedFactoryId(val)
              onFactoryChange(val)
            }}
            placeholder="Select factory..."
          />
        </div>
      )}

      {isLoadingConfig ? (
        <div className="py-8 flex justify-center items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading factory settings...</span>
        </div>
      ) : (
        <>
          {/* Side-by-side grid on md+ screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aadhaar Number Requirement Mode */}
            <div className="flex flex-col justify-between space-y-4 p-4.5 bg-background border rounded-xl shadow-2xs">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                    <Fingerprint className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground leading-tight">Aadhaar Number Mode</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Controls requirement rules for profile registration. Select <strong className="text-foreground font-medium">Mandatory</strong> (enforces 12 digits), <strong className="text-foreground font-medium">Optional</strong> (allows empty values), or <strong className="text-foreground font-medium">Not Required</strong> (hides Aadhaar fields and table columns completely).
                </p>
              </div>
              <div className="pt-2">
                <ModeCombobox
                  value={aadharMode}
                  onChange={(val) => setAadharMode(val)}
                />
              </div>
            </div>

            {/* Govt ID Requirement Mode */}
            <div className="flex flex-col justify-between space-y-4 p-4.5 bg-background border rounded-xl shadow-2xs">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground leading-tight">Govt ID Mode</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Controls requirement rules for customer directory records. Select <strong className="text-foreground font-medium">Mandatory</strong> (enforces numeric ID), <strong className="text-foreground font-medium">Optional</strong> (allows empty values), or <strong className="text-foreground font-medium">Not Required</strong> (hides Govt ID fields and table columns completely).
                </p>
              </div>
              <div className="pt-2">
                <ModeCombobox
                  value={govtIdMode}
                  onChange={(val) => setGovtIdMode(val)}
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-2">
            {isUnchanged && (
              <span className="text-xs text-muted-foreground italic">No changes to save</span>
            )}
            <div className="ml-auto">
              <Button
                onClick={handleSave}
                disabled={isSaving || isUnchanged}
                className="gap-2 px-6"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </CardContent>
  )
}

export function ConfigSettingsView() {
  const currentUser = useAuthStore((state) => state.user)
  const isSuperAdmin = currentUser?.role === Role.SUPER_ADMIN
  const activeConfig = useConfigStore((state) => state.config)

  const [overrideConfig, setOverrideConfig] = React.useState<FactoryConfig | null>(null)
  const [selectedFactoryId, setSelectedFactoryId] = React.useState<string>(
    String(activeConfig?.factoryId || currentUser?.profile?.factory_id || "")
  )
  const [isLoadingConfig, setIsLoadingConfig] = React.useState(false)

  const effectiveConfig = overrideConfig || activeConfig

  // If Super Admin changes target factory, load that factory's config
  const handleFactoryChange = async (factoryIdStr: string) => {
    setSelectedFactoryId(factoryIdStr)
    if (!factoryIdStr) return
    setIsLoadingConfig(true)
    try {
      const res = await axios.get<{ data: Array<{ factory_id: number; aadhar_number_mode: FieldRequirementMode; govt_id_mode: FieldRequirementMode }> }>(ApiRoutes.CONFIGS, {
        params: { factory_id: factoryIdStr },
      })
      const matching = res.data?.data?.[0]
      if (matching) {
        setOverrideConfig({
          factoryId: matching.factory_id,
          aadharNumberMode: matching.aadhar_number_mode,
          govtIdMode: matching.govt_id_mode,
        })
      } else {
        setOverrideConfig({
          factoryId: Number(factoryIdStr),
          aadharNumberMode: FieldRequirementMode.OPTIONAL,
          govtIdMode: FieldRequirementMode.OPTIONAL,
        })
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingConfig(false)
    }
  }

  const formKey = `${effectiveConfig?.factoryId}_${effectiveConfig?.aadharNumberMode}_${effectiveConfig?.govtIdMode}`

  return (
    <div className="max-w-4xl w-full mx-auto py-6 space-y-6">
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Factory Field Requirements</CardTitle>
              <CardDescription className="text-xs">
                Manage identification field behaviors across forms, validation, and table displays.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <ConfigFormContent
          key={formKey}
          initialConfig={effectiveConfig}
          initialFactoryId={selectedFactoryId}
          isSuperAdmin={isSuperAdmin}
          onFactoryChange={handleFactoryChange}
          isLoadingConfig={isLoadingConfig}
        />
      </Card>
    </div>
  )
}
