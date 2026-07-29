/**
 * @file lib/store/entities.ts
 * @description Zustand state store for managing entities data via axios and API routes.
 */

"use client"

import { create } from "zustand"
import axios from "axios"
import { ProjectSlug, ApiRoutes } from "@/lib/constants/enums"
import {
  insertRow,
  updateRow,
  deleteRow,
} from "@/lib/services"

export interface IdNamePair { id: number; name: string }
export interface RateOption { id: number; label: string }

interface PreloadPayload {
  commodities: { id: number; name: string }[]
  factories: { id: number; name: string }[]
  centers: { id: number; name: string }[]
  profiles: { id: number; name: string }[]
  customers: { id: number; name: string }[]
  rates: { id: number; unit_price: string; unit: string; commodity_name?: string; factory_name?: string }[]
}

interface EntitiesState {
  addEntity: (slug: ProjectSlug, newE: Record<string, unknown>) => Promise<void>
  updateEntity: (slug: ProjectSlug, id: string | number, fields: Record<string, unknown>) => Promise<void>
  deleteEntity: (slug: ProjectSlug, id: string | number) => Promise<void>
  entitiesUpdatedTrigger: number
  triggerEntitiesUpdate: () => void
  commodities: { id: number; name: string }[]
  factories: IdNamePair[]
  weighmentFiltersData: {
    centers: IdNamePair[]
    profiles: IdNamePair[]
    customers: IdNamePair[]
    rates: RateOption[]
  } | null
  filtersLoading: boolean
  filtersInitialized: boolean
  preloadAllFilters: () => Promise<void>
}

export const useEntitiesStore = create<EntitiesState>((set, get) => ({
  entitiesUpdatedTrigger: 0,
  triggerEntitiesUpdate: () => set((state) => ({ entitiesUpdatedTrigger: state.entitiesUpdatedTrigger + 1 })),
  filtersLoading: false,
  filtersInitialized: false,

  commodities: [],
  factories: [],
  weighmentFiltersData: null,

  preloadAllFilters: async () => {
    set({ filtersLoading: true })
    try {
      const res = await axios.get<PreloadPayload>(ApiRoutes.FILTERS_PRELOAD)
      const payload = res.data

      const rateOpts: RateOption[] = payload.rates.map((rate) => {
        const factoryInfo = rate.factory_name ? ` (${rate.factory_name})` : ""
        return {
          id: rate.id,
          label: `${rate.commodity_name ?? "Rate"}${factoryInfo} · ₹${rate.unit_price}/${rate.unit} (ID: ${rate.id})`,
        }
      })

      set({
        commodities: payload.commodities,
        factories: payload.factories,
        weighmentFiltersData: {
          centers: payload.centers,
          profiles: payload.profiles,
          customers: payload.customers,
          rates: rateOpts,
        },
      })
    } catch (err) {
      console.error("Failed to preload filter entities:", err)
    } finally {
      set({ filtersLoading: false, filtersInitialized: true })
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
