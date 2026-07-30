"use client"

/**
 * @file components/projects/config-settings.tsx
 * @description Dedicated single-page configuration view for managing Factory Config settings.
 * Supports factory selector for Super Admin in Shared SaaS mode before displaying or editing configs.
 */

import * as React from "react"
import { toast } from "sonner"
import { SlidersHorizontal, Fingerprint, ShieldCheck, Save, Loader2, Factory, Plus, Pencil, X, CheckCircle2, HelpCircle, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ModeCombobox, EntityCombobox } from "@/components/combobox"
import { useConfigStore, useAuthStore, getActiveTenantMode, type FactoryConfig } from "@/lib/store"
import { FieldRequirementMode, Role, TenantMode, ApiRoutes } from "@/lib/constants/enums"
import { getModeColorClass } from "@/lib/fields"
import axios from "axios"

export function ConfigSettingsView() {
  const currentUser = useAuthStore((state) => state.user)
  const activeTenantMode = getActiveTenantMode()
  const isSuperAdmin = currentUser?.role === Role.SUPER_ADMIN
  const showFactorySelector = isSuperAdmin && activeTenantMode === TenantMode.SHARED

  const globalActiveConfig = useConfigStore((state) => state.config)
  const configLoading = useConfigStore((state) => state.configLoading)
  const configInitialized = useConfigStore((state) => state.configInitialized)
  const fetchConfig = useConfigStore((state) => state.fetchConfig)
  const setConfig = useConfigStore((state) => state.setConfig)

  React.useEffect(() => {
    if (!configInitialized && !showFactorySelector) {
      fetchConfig()
    }
  }, [configInitialized, showFactorySelector, fetchConfig])

  // Factory selection state for Super Admin in shared mode
  const [selectedFactoryId, setSelectedFactoryId] = React.useState<string>("")
  const [factoryConfig, setFactoryConfig] = React.useState<FactoryConfig | null>(null)
  const [isFetchingFactoryConfig, setIsFetchingFactoryConfig] = React.useState(false)

  // Fetch factory specific config when Super Admin selects a factory
  const handleFactorySelect = async (factoryIdStr: string) => {
    setSelectedFactoryId(factoryIdStr)
    if (!factoryIdStr) {
      setFactoryConfig(null)
      return
    }
    setIsFetchingFactoryConfig(true)
    try {
      const res = await axios.get<{ data: Array<{ id?: number; factory_id: number; aadhar_number_mode: FieldRequirementMode; govt_id_mode: FieldRequirementMode }> }>(
        ApiRoutes.CONFIGS,
        { params: { factory_id: factoryIdStr } }
      )
      const matching = res.data?.data?.[0]
      if (matching) {
        setFactoryConfig({
          id: matching.id,
          factoryId: matching.factory_id,
          aadharNumberMode: matching.aadhar_number_mode,
          govtIdMode: matching.govt_id_mode,
        })
      } else {
        setFactoryConfig(null)
      }
    } catch {
      setFactoryConfig(null)
    } finally {
      setIsFetchingFactoryConfig(false)
    }
  }

  // Active configuration for current view context
  const activeConfig = showFactorySelector ? factoryConfig : globalActiveConfig

  // Dialog & Modal Form State
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [aadharMode, setAadharMode] = React.useState<string>(FieldRequirementMode.MANDATORY)
  const [govtIdMode, setGovtIdMode] = React.useState<string>(FieldRequirementMode.MANDATORY)
  const [isSaving, setIsSaving] = React.useState(false)

  const hasRecord = Boolean(activeConfig?.id)
  const isEdit = hasRecord

  // Track dirty state matching datatable entity dialogs
  const isDirty =
    aadharMode !== (activeConfig?.aadharNumberMode || FieldRequirementMode.MANDATORY) ||
    govtIdMode !== (activeConfig?.govtIdMode || FieldRequirementMode.MANDATORY)

  const isUnchanged = isEdit && !isDirty

  // Open modal with fresh defaults or existing config
  const handleOpenModal = () => {
    setAadharMode(activeConfig?.aadharNumberMode || FieldRequirementMode.MANDATORY)
    setGovtIdMode(activeConfig?.govtIdMode || FieldRequirementMode.MANDATORY)
    setDialogOpen(true)
  }

  // Save button disable validation
  const isSaveDisabled =
    isSaving ||
    (isEdit && isUnchanged) ||
    (showFactorySelector && (!selectedFactoryId || Number(selectedFactoryId) <= 0))

  const handleSave = async () => {
    if (showFactorySelector && (!selectedFactoryId || Number(selectedFactoryId) <= 0)) {
      toast.error("Please select a factory")
      return
    }

    setIsSaving(true)
    try {
      const payload: Record<string, unknown> = {
        aadhar_number_mode: aadharMode,
        govt_id_mode: govtIdMode,
      }

      if (showFactorySelector && selectedFactoryId) {
        payload.factory_id = Number(selectedFactoryId)
      }

      const res = await axios.put<{ data: { id?: number; factory_id?: number; aadhar_number_mode: FieldRequirementMode; govt_id_mode: FieldRequirementMode } }>(
        ApiRoutes.CONFIGS,
        payload
      )

      if (res.data?.data) {
        const updated = res.data.data
        const newConfigObj: FactoryConfig = {
          id: updated.id,
          factoryId: updated.factory_id,
          aadharNumberMode: updated.aadhar_number_mode,
          govtIdMode: updated.govt_id_mode,
        }
        if (showFactorySelector) {
          setFactoryConfig(newConfigObj)
        } else {
          setConfig(newConfigObj)
        }
        toast.success("Configuration saved successfully")
        setDialogOpen(false)
      }
    } catch (err: unknown) {
      console.error("Save config error:", err)
      const message = axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : "Failed to save configuration"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const ModalIcon = isEdit ? Pencil : Plus

  if (configLoading && !showFactorySelector && !globalActiveConfig) {
    return (
      <div className="max-w-4xl w-full mx-auto py-16 flex flex-col items-center justify-center gap-3 bg-card border rounded-xl shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-xs font-medium text-muted-foreground">Loading configuration settings...</span>
      </div>
    )
  }

  return (
    <div className="max-w-4xl w-full mx-auto py-6 space-y-6 flex flex-col items-center justify-center">
      {/* Factory Selector Card for Super Admin in Shared SaaS Mode */}
      {showFactorySelector && (
        <Card className="w-full border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <Factory className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Select Factory</CardTitle>
                <CardDescription className="text-xs">
                  Choose a factory to view and manage its field requirement configuration.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-w-md">
              <EntityCombobox
                entitySlug="factories"
                value={selectedFactoryId}
                onChange={handleFactorySelect}
                placeholder="Select factory..."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Configuration Card */}
      {showFactorySelector && !selectedFactoryId ? (
        /* Prompt when Super Admin has not selected a factory yet */
        <Card className="w-full border shadow-sm">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-4 bg-muted/60 rounded-full">
              <Factory className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-semibold text-foreground">No Factory Selected</h3>
              <p className="text-xs text-muted-foreground">
                Please select a factory from the dropdown above to view or manage its field requirement rules.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isFetchingFactoryConfig ? (
        /* Loading indicator when fetching selected factory config */
        <Card className="w-full border shadow-sm">
          <CardContent className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading factory configuration...</span>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">
                    {hasRecord ? "Field Requirements Configuration" : "No Configuration Set"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {hasRecord
                      ? "Manage identification field requirement modes for profiles and customers."
                      : "No configuration has been saved in the database for this factory yet. Click 'Add Config' to create one."}
                  </CardDescription>
                </div>
              </div>

              {/* Action Button: Add Config or Edit Config */}
              <Button onClick={handleOpenModal} className="gap-2 shrink-0">
                {hasRecord ? (
                  <>
                    <Pencil className="h-4 w-4" />
                    Edit Config
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Config
                  </>
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            {!hasRecord ? (
              /* Empty State Banner */
              <div className="p-8 border border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-3 bg-muted/20">
                <div className="p-3 bg-muted rounded-full">
                  <SlidersHorizontal className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">No Configuration Record Found</h4>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Aadhaar Number and Govt ID fields are operating with default fallback rules (Mandatory). Click below to create a configuration record in the database.
                  </p>
                </div>
                <Button onClick={handleOpenModal} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Config
                </Button>
              </div>
            ) : (
              /* Active Configuration Overview Cards */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Aadhaar Mode Overview */}
                <div className="p-4 bg-background border rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Aadhaar Number Mode</span>
                    </div>
                    <ModeBadge mode={activeConfig?.aadharNumberMode || FieldRequirementMode.MANDATORY} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Controls Aadhaar validation and field visibility across profile forms and table views.
                  </p>
                </div>

                {/* Govt ID Mode Overview */}
                <div className="p-4 bg-background border rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-foreground">Govt ID Mode</span>
                    </div>
                    <ModeBadge mode={activeConfig?.govtIdMode || FieldRequirementMode.MANDATORY} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Controls Govt ID validation and field visibility across customer forms and table views.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Dialog matching standard Datatable EntityDialog styling */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[92vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <ModalIcon className="h-4 w-4 text-primary" /> {isEdit ? "Edit" : "Add"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the attributes of this record. Click save when done."
                : "Enter the details for the new configuration. Click save when done."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Aadhaar Number Mode Combobox */}
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Fingerprint className="h-3.5 w-3.5 text-muted-foreground/75" />
                Aadhaar Number Mode
              </label>
              <ModeCombobox
                value={aadharMode}
                onChange={(val) => setAadharMode(val)}
              />
            </div>

            {/* Govt ID Mode Combobox */}
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground/75" />
                Govt ID Mode
              </label>
              <ModeCombobox
                value={govtIdMode}
                onChange={(val) => setGovtIdMode(val)}
              />
            </div>

            {/* Dialog Footer matching Datatable EntityDialogFooter */}
            <DialogFooter className="bg-transparent border-t-0 p-0 pt-4 mx-0 mb-0 flex flex-row items-center justify-between gap-3">
              {isEdit && isUnchanged && (
                <span className="text-xs text-muted-foreground italic">No changes to save</span>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Button type="button" variant="ghost" size="sm" onClick={() => setDialogOpen(false)} className="gap-1.5 h-8 px-3 text-xs" disabled={isSaving}>
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button type="button" size="sm" onClick={handleSave} className="gap-1.5 h-8 px-3 text-xs shadow-sm" disabled={isSaveDisabled}>
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ModeBadge({ mode }: { mode: string }) {
  const colorClass = getModeColorClass(mode)
  let Icon = HelpCircle
  let label = "Optional"

  if (mode === FieldRequirementMode.MANDATORY || mode.toLowerCase() === "mandatory") {
    Icon = CheckCircle2
    label = "Mandatory"
  } else if (mode === FieldRequirementMode.NOT_REQUIRED || mode.toLowerCase() === "not required" || mode.toLowerCase() === "not_required") {
    Icon = Ban
    label = "Not Required"
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted/60 ${colorClass}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}
