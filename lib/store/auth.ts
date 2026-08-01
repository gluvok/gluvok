/**
 * @file lib/store/auth.ts
 * @description Zustand state store for managing authentication and user session via custom JWT API endpoints (axios).
 */

import { create } from "zustand"
import axios from "axios"
import { toast } from "sonner"
import { Role, EntityKey, TenantMode } from "@/lib/constants/enums"
import { DEFAULT_AVATAR, AuthErrorMessage } from "@/lib/constants"

import { useConfigStore } from "./config"
import { useEntitiesStore } from "./entities"

export const PROFILE_SELECT_FIELDS = `${EntityKey.ID}, ${EntityKey.USER_ID}, ${EntityKey.NAME}, ${EntityKey.ROLE}, ${EntityKey.AADHAR_NUMBER}, ${EntityKey.FACTORY_ID}, ${EntityKey.CREATED_AT}, ${EntityKey.UPDATED_AT}`
export const CUSTOMER_SELECT_FIELDS = `${EntityKey.ID}, ${EntityKey.NAME}, ${EntityKey.GOVT_ID}, ${EntityKey.FATHER_NAME}, ${EntityKey.FACTORY_ID}, ${EntityKey.USER_ID}, ${EntityKey.CREATED_AT}, ${EntityKey.UPDATED_AT}`

export interface AuthUser {
  id: string
  name?: string
  username: string
  avatar?: string
  role: Role
  factory_id: number | null
  tenant_mode?: TenantMode
}

interface AuthStore {
  user: AuthUser | null
  hydrated: boolean
  initialized: boolean
  profileLoading: boolean
  initAuth: () => () => void
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  setHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  hydrated: false,
  initialized: false,
  profileLoading: false,
  initAuth: () => {
    if (get().initialized) {
      return () => { }
    }

    set({ profileLoading: true })

    // Call /api/auth/me using axios to check active JWT session
    axios
      .get<{ user: AuthUser | null }>("/api/auth/me", {
        validateStatus: (status) => status < 500,
      })
      .then((res) => {
        if (res.data?.user) {
          set({
            user: {
              ...res.data.user,
              avatar: DEFAULT_AVATAR,
            },
            initialized: true,
            profileLoading: false,
          })
          useConfigStore.getState().fetchConfig()
          useEntitiesStore.getState().preloadAllFilters({ silent: true })
        } else {
          set({ user: null, initialized: true, profileLoading: false })
        }
      })
      .catch((err) => {
        console.error("Failed to check active auth session:", err)
        set({ user: null, initialized: true, profileLoading: false })
      })

    return () => { }
  },
  login: async (username, password) => {
    try {
      const res = await axios.post<{ success: boolean; user: AuthUser; error?: string }>(
        "/api/auth/login",
        { username, password },
        { validateStatus: (status) => status < 600 }
      )

      const data = res.data
      if (res.status !== 200 || !data.success || !data.user) {
        const errorMsg =
          data.error ||
          (res.status === 401
            ? AuthErrorMessage.INVALID_CREDENTIALS
            : res.status === 500 ? AuthErrorMessage.INTERNAL_SERVER_ERROR : AuthErrorMessage.SIGN_IN_ERROR)
        toast.error(errorMsg)
        set({ user: null })
        return false
      }

      set({
        user: {
          ...data.user,
          avatar: DEFAULT_AVATAR,
        },
        initialized: true,
      })

      useConfigStore.getState().fetchConfig()
      useEntitiesStore.getState().preloadAllFilters({ silent: true })

      const name = data.user.name || data.user.username
      toast.success(`Welcome back, ${name}! 🎉`)
      return true
    } catch (err: unknown) {
      console.error("Login request error:", err)
      const errorMsg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : AuthErrorMessage.SIGN_IN_ERROR
      toast.error(errorMsg)
      set({ user: null })
      return false
    }
  },
  logout: async () => {
    const currentUser = get().user
    const name = currentUser?.name || currentUser?.username || "there"
    try {
      await axios.post("/api/auth/logout")
    } catch (err) {
      console.error("Logout request error:", err)
    } finally {
      set({ user: null })
      toast.success(`See you soon, ${name}! Logged out successfully 👋`)
    }
  },
  setHydrated: (state) => set({ hydrated: state }),
}))
