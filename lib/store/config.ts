/**
 * @file lib/store/config.ts
 * @description Zustand state store for managing active factory configuration/settings.
 */

import { create } from "zustand"
import axios from "axios"
import { FieldRequirementMode } from "@/lib/constants/enums"

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

    try {
      const res = await axios.get<{ data: ConfigResponseData[] }>("/api/settings")
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
