/**
 * @file lib/store/config.ts
 * @description Zustand state store for managing active tenant factory configuration.
 */

import { create } from "zustand"
import axios from "axios"
import { FieldRequirementMode } from "@/lib/constants/enums"

export interface FactoryConfig {
  id?: number
  factoryId: number
  aadharNumberMode: FieldRequirementMode
  govtIdMode: FieldRequirementMode
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
      const res = await axios.get<{ config: FactoryConfig | null }>("/api/configs/active")
      set({ config: res.data?.config || null, configLoading: false, configInitialized: true })
    } catch {
      set({ config: null, configLoading: false, configInitialized: true })
    }
  },
  setConfig: (config) => set({ config, configLoading: false, configInitialized: true }),
  resetConfig: () => set({ config: null, configLoading: false, configInitialized: true }),
}))
