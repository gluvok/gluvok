/**
 * @file lib/store/factory.ts
 * @description Zustand state store for managing the active factory.
 */

import { create } from "zustand"
import axios from "axios"
import { FieldRequirementMode } from "@/lib/constants/enums"

import { type Factory } from "@/types"

interface FactoryResponseData {
  id: number
  name: string
  aadhar_number_mode: FieldRequirementMode
  govt_id_mode: FieldRequirementMode
  created_at: string
  updated_at: string
}

interface FactoryStore {
  factory: Factory | null
  factoryLoading: boolean
  factoryInitialized: boolean
  fetchFactory: () => Promise<void>
  setFactory: (factory: Factory | null) => void
  resetFactory: () => void
}

const DEFAULT_FACTORY: Factory = {
  id: 0,
  name: "Default Factory",
  aadhar_number_mode: FieldRequirementMode.MANDATORY,
  govt_id_mode: FieldRequirementMode.MANDATORY,
  created_at: "",
  updated_at: "",
}

export const useFactoryStore = create<FactoryStore>((set) => ({
  factory: null,
  factoryLoading: true,
  factoryInitialized: false,
  fetchFactory: async () => {
    set({ factoryLoading: true })

    try {
      const res = await axios.get<{ data: FactoryResponseData | FactoryResponseData[] }>("/api/settings")
      const rawData = res.data?.data
      const row = Array.isArray(rawData) ? rawData[0] : rawData
      const factory: Factory = row
        ? {
            ...row,
          }
        : DEFAULT_FACTORY
      set({ factory, factoryLoading: false, factoryInitialized: true })
    } catch {
      set({
        factory: DEFAULT_FACTORY,
        factoryLoading: false,
        factoryInitialized: true,
      })
    }
  },
  setFactory: (factory) => set({ factory, factoryLoading: false, factoryInitialized: true }),
  resetFactory: () => set({ factory: null, factoryLoading: false, factoryInitialized: true }),
}))
