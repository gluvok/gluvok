/**
 * @file lib/store/entities.ts
 * @description Zustand state store for managing entities data via axios and API routes.
 * Maintains filter entities in local Zustand state memory without fetching from database on CUD.
 */

"use client"

import { create } from "zustand"
import axios from "axios"
import { ProjectSlug, ApiRoutes } from "@/lib/constants/enums"
import { toast } from "sonner"
import {
  insertRow,
  updateRow,
  deleteRow,
} from "@/lib/services"

export interface IdNamePair { id: number; name: string }
export interface RateOption { id: number; label: string }

interface PreloadPayload {
  commodities: { id: number; name: string }[]
  centers: { id: number; name: string }[]
  profiles: { id: number; name: string }[]
  customers: { id: number; name: string }[]
  rates: { id: number; unit_price: string; unit: string; commodity_name?: string }[]
}

interface EntitiesState {
  addEntity: (slug: ProjectSlug, newE: Record<string, unknown>) => Promise<void>
  updateEntity: (slug: ProjectSlug, id: string | number, fields: Record<string, unknown>) => Promise<void>
  deleteEntity: (slug: ProjectSlug, id: string | number) => Promise<void>
  entitiesUpdatedTrigger: number
  triggerEntitiesUpdate: () => void
  commodities: { id: number; name: string }[]
  weighmentFiltersData: {
    centers: IdNamePair[]
    profiles: IdNamePair[]
    customers: IdNamePair[]
    rates: RateOption[]
  } | null
  filtersLoading: boolean
  filtersInitialized: boolean
  preloadAllFilters: (options?: { silent?: boolean }) => Promise<void>
}

export const useEntitiesStore = create<EntitiesState>((set, get) => ({
  entitiesUpdatedTrigger: 0,
  triggerEntitiesUpdate: () => set((state) => ({ entitiesUpdatedTrigger: state.entitiesUpdatedTrigger + 1 })),
  filtersLoading: false,
  filtersInitialized: false,

  commodities: [],
  weighmentFiltersData: null,

  preloadAllFilters: async (options) => {
    if (get().filtersLoading) return
    set({ filtersLoading: true })
    const isSilent = options?.silent ?? false
    const toastId = !isSilent && typeof toast?.loading === "function" ? toast.loading("Syncing data...", { id: "sync-data-toast" }) : undefined
    try {
      const res = await axios.get<PreloadPayload>(ApiRoutes.FILTERS_PRELOAD)
      const payload = res.data

      const rateOpts: RateOption[] = (payload?.rates || []).map((rate) => {
        return {
          id: rate.id,
          label: `${rate.commodity_name ?? "Rate"} · ₹${rate.unit_price}/${rate.unit} (ID: ${rate.id})`,
        }
      })

      set({
        commodities: payload?.commodities || [],
        weighmentFiltersData: {
          centers: payload?.centers || [],
          profiles: payload?.profiles || [],
          customers: payload?.customers || [],
          rates: rateOpts,
        },
      })
      if (!isSilent) {
        if (toastId) {
          toast.success("Data synced successfully", { id: toastId })
        } else {
          toast.success("Data synced successfully")
        }
      }
    } catch (err) {
      console.error("Failed to preload filter entities:", err)
      if (!isSilent) {
        if (toastId) {
          toast.error("Failed to sync data", { id: toastId })
        } else {
          toast.error("Failed to sync data")
        }
      }
    } finally {
      set({ filtersLoading: false, filtersInitialized: true })
    }
  },

  addEntity: async (slug, newE) => {
    const created = (await insertRow(slug, newE)) as unknown as Record<string, unknown> | undefined
    const state = get()

    if (created && typeof created === "object") {
      const createdId = Number(created.id)
      const name = String(created.name || newE.name || "")

      switch (slug) {
        case ProjectSlug.COMMODITIES:
          if (createdId) {
            set({ commodities: [...state.commodities.filter((c) => c.id !== createdId), { id: createdId, name }] })
          }
          break
        case ProjectSlug.CENTERS:
          if (createdId && state.weighmentFiltersData) {
            set({
              weighmentFiltersData: {
                ...state.weighmentFiltersData,
                centers: [...state.weighmentFiltersData.centers.filter((c) => c.id !== createdId), { id: createdId, name }],
              },
            })
          }
          break
        case ProjectSlug.PROFILES:
          if (createdId && state.weighmentFiltersData) {
            set({
              weighmentFiltersData: {
                ...state.weighmentFiltersData,
                profiles: [...state.weighmentFiltersData.profiles.filter((p) => p.id !== createdId), { id: createdId, name }],
              },
            })
          }
          break
        case ProjectSlug.CUSTOMERS:
          if (createdId && state.weighmentFiltersData) {
            set({
              weighmentFiltersData: {
                ...state.weighmentFiltersData,
                customers: [...state.weighmentFiltersData.customers.filter((c) => c.id !== createdId), { id: createdId, name }],
              },
            })
          }
          break
        case ProjectSlug.RATES: {
          if (createdId && state.weighmentFiltersData) {
            const commodityId = Number(created.commodity_id || created.commodityId || newE.commodity_id)
            const foundCommodity = state.commodities.find((c) => c.id === commodityId)
            const commodityName = String(created.commodity_name || foundCommodity?.name || "Rate")
            const unitPrice = String(created.unit_price || created.unitPrice || newE.unit_price || "")
            const unit = String(created.unit || newE.unit || "")
            const label = `${commodityName} · ₹${unitPrice}/${unit} (ID: ${createdId})`

            set({
              weighmentFiltersData: {
                ...state.weighmentFiltersData,
                rates: [...state.weighmentFiltersData.rates.filter((r) => r.id !== createdId), { id: createdId, label }],
              },
            })
          }
          break
        }
        default:
          break
      }
    }

    get().triggerEntitiesUpdate()
  },

  updateEntity: async (slug, id, fields) => {
    const updated = (await updateRow(slug, Number(id), fields)) as unknown as Record<string, unknown> | undefined
    const targetId = Number(id)
    const state = get()

    if (updated && typeof updated === "object") {
      const name = String(updated.name || fields.name || "")

      switch (slug) {
        case ProjectSlug.COMMODITIES:
          set({ commodities: state.commodities.map((c) => (c.id === targetId ? { id: targetId, name } : c)) })
          break
        case ProjectSlug.CENTERS:
          if (state.weighmentFiltersData) {
            set({
              weighmentFiltersData: {
                ...state.weighmentFiltersData,
                centers: state.weighmentFiltersData.centers.map((c) => (c.id === targetId ? { id: targetId, name } : c)),
              },
            })
          }
          break
        case ProjectSlug.PROFILES:
          if (state.weighmentFiltersData) {
            set({
              weighmentFiltersData: {
                ...state.weighmentFiltersData,
                profiles: state.weighmentFiltersData.profiles.map((p) => (p.id === targetId ? { id: targetId, name } : p)),
              },
            })
          }
          break
        case ProjectSlug.CUSTOMERS:
          if (state.weighmentFiltersData) {
            set({
              weighmentFiltersData: {
                ...state.weighmentFiltersData,
                customers: state.weighmentFiltersData.customers.map((c) => (c.id === targetId ? { id: targetId, name } : c)),
              },
            })
          }
          break
        case ProjectSlug.RATES: {
          if (state.weighmentFiltersData) {
            const commodityId = Number(updated.commodity_id || updated.commodityId || fields.commodity_id)
            const foundCommodity = state.commodities.find((c) => c.id === commodityId)
            const commodityName = String(updated.commodity_name || foundCommodity?.name || "Rate")
            const unitPrice = String(updated.unit_price || updated.unitPrice || fields.unit_price || "")
            const unit = String(updated.unit || fields.unit || "")
            const label = `${commodityName} · ₹${unitPrice}/${unit} (ID: ${targetId})`

            set({
              weighmentFiltersData: {
                ...state.weighmentFiltersData,
                rates: state.weighmentFiltersData.rates.map((r) => (r.id === targetId ? { id: targetId, label } : r)),
              },
            })
          }
          break
        }
        default:
          break
      }
    }

    get().triggerEntitiesUpdate()
  },

  deleteEntity: async (slug, id) => {
    const targetId = Number(id)
    await deleteRow(slug, targetId)
    const state = get()

    switch (slug) {
      case ProjectSlug.COMMODITIES:
        set({ commodities: state.commodities.filter((c) => c.id !== targetId) })
        break
      case ProjectSlug.CENTERS:
        if (state.weighmentFiltersData) {
          set({
            weighmentFiltersData: {
              ...state.weighmentFiltersData,
              centers: state.weighmentFiltersData.centers.filter((c) => c.id !== targetId),
            },
          })
        }
        break
      case ProjectSlug.PROFILES:
        if (state.weighmentFiltersData) {
          set({
            weighmentFiltersData: {
              ...state.weighmentFiltersData,
              profiles: state.weighmentFiltersData.profiles.filter((p) => p.id !== targetId),
            },
          })
        }
        break
      case ProjectSlug.CUSTOMERS:
        if (state.weighmentFiltersData) {
          set({
            weighmentFiltersData: {
              ...state.weighmentFiltersData,
              customers: state.weighmentFiltersData.customers.filter((c) => c.id !== targetId),
            },
          })
        }
        break
      case ProjectSlug.RATES:
        if (state.weighmentFiltersData) {
          set({
            weighmentFiltersData: {
              ...state.weighmentFiltersData,
              rates: state.weighmentFiltersData.rates.filter((r) => r.id !== targetId),
            },
          })
        }
        break
      default:
        break
    }

    get().triggerEntitiesUpdate()
  },
}))
