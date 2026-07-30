/**
 * @file lib/store/config.ts
 * @description Zustand state store for managing active tenant factory configuration.
 */

import { create } from "zustand"
import axios from "axios"
import { FieldRequirementMode, Role, TenantMode } from "@/lib/constants/enums"
import { useAuthStore } from "./auth"
import { getActiveTenantMode } from "./access"

export interface FactoryConfig {
  id?: number
  factoryId?: number | null
  aadharNumberMode: FieldRequirementMode
  govtIdMode: FieldRequirementMode
}

interface ConfigResponseData {
  id?: number
  factory_id?: number | null
  aadhar_number_mode: FieldRequirementMode
  govt_id_mode: FieldRequirementMode
}

interface ConfigStore {
  config: FactoryConfig | null
  configLoading: boolean
  configInitialized: boolean
  fetchConfig: () => Promise<void>
  setConfig: (config: FactoryConfig | null) => void
  resetConfig: () => void
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: null,
  configLoading: true,
  configInitialized: false,
  fetchConfig: async () => {
    set({ configLoading: true })
    const currentUser = useAuthStore.getState().user
    const tenantMode = getActiveTenantMode()

    // Super Admin in Shared SaaS mode manages multiple factories — skip initial single config fetch
    if (tenantMode === TenantMode.SHARED && currentUser?.role === Role.SUPER_ADMIN) {
      set({ config: null, configLoading: false, configInitialized: true })
      return
    }

    try {
      const res = await axios.get<{ data: ConfigResponseData[] }>("/api/configs")
      const row = res.data?.data?.[0]
      const config: FactoryConfig = row
        ? {
            id: row.id,
            factoryId: row.factory_id,
            aadharNumberMode: row.aadhar_number_mode,
            govtIdMode: row.govt_id_mode,
          }
        : {
            aadharNumberMode: FieldRequirementMode.MANDATORY,
            govtIdMode: FieldRequirementMode.MANDATORY,
          }
      set({ config, configLoading: false, configInitialized: true })
    } catch {
      set({
        config: {
          aadharNumberMode: FieldRequirementMode.MANDATORY,
          govtIdMode: FieldRequirementMode.MANDATORY,
        },
        configLoading: false,
        configInitialized: true,
      })
    }
  },
  setConfig: (config) => set({ config, configLoading: false, configInitialized: true }),
  resetConfig: () => set({ config: null, configLoading: false, configInitialized: true }),
}))
