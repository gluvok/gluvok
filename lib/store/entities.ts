/**
 * @file lib/store/entities.ts
 * @description Zustand state store for managing entities data via axios and API routes.
 */

"use client"

import { create } from "zustand"
import { type Commodity, type Factory, type Center, type Profile, type Customer, type Rate } from "@/types"
import { ProjectSlug } from "@/lib/constants/enums"
import {
  insertRow,
  updateRow,
  deleteRow,
  fetchEntityListFromApi,
} from "@/lib/services"

export interface IdNamePair { id: number; name: string }
export interface RateOption { id: number; label: string }

interface EntitiesState {
  addEntity: (slug: ProjectSlug, newE: Record<string, unknown>) => Promise<void>
  updateEntity: (slug: ProjectSlug, id: string | number, fields: Record<string, unknown>) => Promise<void>
  deleteEntity: (slug: ProjectSlug, id: string | number) => Promise<void>
  entitiesUpdatedTrigger: number
  triggerEntitiesUpdate: () => void
  commodities: Commodity[]
  loadCommodities: () => Promise<void>
  factories: IdNamePair[]
  loadFactories: () => Promise<void>
  weighmentFiltersData: {
    centers: IdNamePair[]
    profiles: IdNamePair[]
    customers: IdNamePair[]
    rates: RateOption[]
  } | null
  loadWeighmentFiltersData: () => Promise<void>
  filtersLoading: Record<string, boolean>
  setFiltersLoading: (slug: string, loading: boolean) => void
}

export const useEntitiesStore = create<EntitiesState>((set, get) => ({
  entitiesUpdatedTrigger: 0,
  triggerEntitiesUpdate: () => set((state) => ({ entitiesUpdatedTrigger: state.entitiesUpdatedTrigger + 1 })),
  filtersLoading: {},
  setFiltersLoading: (slug, loading) => set((state) => ({
    filtersLoading: { ...state.filtersLoading, [slug]: loading }
  })),
  commodities: [],
  loadCommodities: async () => {
    set((state) => ({
      filtersLoading: { ...state.filtersLoading, [ProjectSlug.RATES]: true }
    }))
    try {
      const list = await fetchEntityListFromApi<Commodity>(ProjectSlug.COMMODITIES)
      set((state) => ({
        commodities: list,
        filtersLoading: { ...state.filtersLoading, [ProjectSlug.RATES]: false }
      }))
    } catch (err) {
      console.error("Failed to fetch commodities for store:", err)
      set((state) => ({
        filtersLoading: { ...state.filtersLoading, [ProjectSlug.RATES]: false }
      }))
    }
  },

  factories: [],
  loadFactories: async () => {
    set((state) => ({
      filtersLoading: { ...state.filtersLoading, [ProjectSlug.CENTERS]: true }
    }))
    try {
      const list = await fetchEntityListFromApi<Factory>(ProjectSlug.FACTORIES)
      set((state) => ({
        factories: list.map((f) => ({ id: f.id, name: f.name })),
        filtersLoading: { ...state.filtersLoading, [ProjectSlug.CENTERS]: false }
      }))
    } catch (err) {
      console.error("Failed to fetch factories for store:", err)
      set((state) => ({
        filtersLoading: { ...state.filtersLoading, [ProjectSlug.CENTERS]: false }
      }))
    }
  },
  weighmentFiltersData: null,
  loadWeighmentFiltersData: async () => {
    set((state) => ({
      filtersLoading: { ...state.filtersLoading, [ProjectSlug.WEIGHMENTS]: true }
    }))
    try {
      const [cList, pList, cuList, rList] = await Promise.all([
        fetchEntityListFromApi<Center>(ProjectSlug.CENTERS),
        fetchEntityListFromApi<Profile>(ProjectSlug.PROFILES),
        fetchEntityListFromApi<Customer>(ProjectSlug.CUSTOMERS),
        fetchEntityListFromApi<Rate>(ProjectSlug.RATES),
      ])

      const centers = cList.map((c) => ({ id: c.id, name: c.name }))
      const profiles = pList.map((p) => ({ id: p.id, name: p.name }))
      const customers = cuList.map((cu) => ({ id: cu.id, name: cu.name }))
      const rateOpts = rList.map((rate) => {
        const factoryInfo = rate.factory_name ? ` (${rate.factory_name})` : ""
        return {
          id: rate.id,
          label: `${rate.commodity_name ?? "Rate"}${factoryInfo} · ₹${rate.unit_price}/${rate.unit} (ID: ${rate.id})`,
        }
      })

      set((state) => ({
        weighmentFiltersData: { centers, profiles, customers, rates: rateOpts },
        filtersLoading: { ...state.filtersLoading, [ProjectSlug.WEIGHMENTS]: false }
      }))
    } catch (err) {
      console.error("Failed to fetch weighment filters for store:", err)
      set((state) => ({
        filtersLoading: { ...state.filtersLoading, [ProjectSlug.WEIGHMENTS]: false }
      }))
    }
  },

  addEntity: async (slug, newE) => {
    await insertRow(slug, newE)
    get().triggerEntitiesUpdate()
  },

  updateEntity: async (slug, id, fields) => {
    await updateRow(slug, Number(id), fields)
    get().triggerEntitiesUpdate()
  },

  deleteEntity: async (slug, id) => {
    await deleteRow(slug, Number(id))
    get().triggerEntitiesUpdate()
  },
}))
