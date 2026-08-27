/**
 * @file lib/store/auth.ts
 * @description Zustand state store for managing authentication and user session via custom JWT API endpoints (axios).
 */

import { create } from "zustand";
import axios from "axios";
import { toast } from "sonner";
import { Role } from "@/lib/constants/enums";
import { DEFAULT_AVATAR, AuthErrorMessage } from "@/lib/constants";

import { useFactoryStore } from "./factory";
import { useEntitiesStore } from "./entities";

export interface AuthUser {
  id: string;
  username: string;
  name?: string;
  avatar?: string;
  aadhar_number?: string | null;
  role: Role;
  factory_id: number;
}

interface AuthStore {
  user: AuthUser | null;
  hydrated: boolean;
  initialized: boolean;
  userLoading: boolean;
  initAuth: () => () => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  hydrated: false,
  initialized: false,
  userLoading: false,
  initAuth: () => {
    if (get().initialized) {
      if (get().userLoading) {
        set({ userLoading: false });
      }
      return () => {};
    }

    set({ userLoading: true });

    axios
      .get<{ user: AuthUser | null }>("/api/auth/me", {
        validateStatus: (status) => status < 500,
        timeout: 10000,
      })
      .then((res) => {
        if (res.data?.user) {
          set({
            user: {
              ...res.data.user,
              avatar: DEFAULT_AVATAR,
            },
            initialized: true,
            userLoading: false,
          });
          useFactoryStore.getState().fetchFactory();
          useEntitiesStore.getState().preloadAllFilters({ silent: true });
        } else {
          set({ user: null, initialized: true, userLoading: false });
        }
      })
      .catch((err) => {
        console.error("Failed to check active auth session:", err);
        set({ user: null, initialized: true, userLoading: false });
      });

    return () => {};
  },
  login: async (username, password) => {
    try {
      const res = await axios.post<{ success: boolean; user: AuthUser; error?: string }>(
        "/api/auth/login",
        { username, password },
        { validateStatus: (status) => status < 600 },
      );

      const data = res.data;
      if (res.status !== 200 || !data.success || !data.user) {
        const errorMsg =
          data.error ||
          (res.status === 401
            ? AuthErrorMessage.INVALID_CREDENTIALS
            : res.status === 500
              ? AuthErrorMessage.INTERNAL_SERVER_ERROR
              : AuthErrorMessage.SIGN_IN_ERROR);
        toast.error(errorMsg);
        set({ user: null });
        return false;
      }

      set({
        user: {
          ...data.user,
          avatar: DEFAULT_AVATAR,
        },
        initialized: true,
      });

      useFactoryStore.getState().fetchFactory();
      useEntitiesStore.getState().preloadAllFilters({ silent: true });

      const displayName = data.user.name || data.user.username;
      toast.success(`Welcome back, ${displayName}! 🎉`);
      return true;
    } catch (err: unknown) {
      console.error("Login request error:", err);
      const errorMsg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : AuthErrorMessage.SIGN_IN_ERROR;
      toast.error(errorMsg);
      set({ user: null });
      return false;
    }
  },
  logout: async () => {
    const currentUser = get().user;
    const displayName = currentUser?.name || currentUser?.username || "there";
    try {
      await axios.post("/api/auth/logout");
    } catch (err) {
      console.error("Logout request error:", err);
    } finally {
      set({ user: null });
      toast.success(`See you soon, ${displayName}! Logged out successfully 👋`);
    }
  },
  setHydrated: (state) => set({ hydrated: state }),
}));
