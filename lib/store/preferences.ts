/**
 * @file lib/store/preferences.ts
 * @description Zustand store for user UI preferences (column visibility, filters) saved per username in localStorage.
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface PreferencesState {
  /** Column visibility: keyed by `${username}:${projectSlug}` or `${projectSlug}` */
  columns: Record<string, string[]>
  /** Filter preferences: keyed by `${username}:${projectSlug}` or `${projectSlug}` */
  filters: Record<string, Record<string, unknown>>

  setColumnPreferences: (projectSlug: string, visibleColumns: string[], username?: string) => void
  setFilterPreferences: (projectSlug: string, filters: Record<string, unknown>, username?: string) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      columns: {},
      filters: {},

      setColumnPreferences: (projectSlug, visibleColumns, username) =>
        set((state) => {
          const key = username ? `${username}:${projectSlug}` : projectSlug
          return {
            columns: { ...state.columns, [key]: visibleColumns },
          }
        }),

      setFilterPreferences: (projectSlug, filters, username) =>
        set((state) => {
          const key = username ? `${username}:${projectSlug}` : projectSlug
          return {
            filters: { ...state.filters, [key]: filters },
          }
        }),
    }),
    {
      name: "gluvok-preferences",
    }
  )
)
