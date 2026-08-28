/**
 * @file lib/store/entities.ts
 * @description Zustand state store for managing entities data via axios and API routes.
 * Maintains filter entities in local Zustand state memory without fetching from database on CUD.
 */

"use client";

import { create } from "zustand";
import axios from "axios";
import { ProjectSlug } from "@/lib/constants/enums";
import { toast } from "sonner";
import { insertRow, updateRow, deleteRow, deleteRows } from "@/lib/services";
import { useFactoryStore } from "@/lib/store/factory";

export interface IdNamePair {
  id: number;
  name: string;
}
export interface RateOption {
  id: number;
  label: string;
}

interface PreloadPayload {
  commodities: { id: number; name: string }[];
  centers: { id: number; name: string }[];
  users: { id: number; name: string }[];
  customers: { id: number; name: string }[];
  rates: { id: number; unit_price: string; unit: string; commodity_name?: string }[];
}

interface EntitiesState {
  addEntity: (slug: ProjectSlug, newE: Record<string, unknown>) => Promise<void>;
  updateEntity: (
    slug: ProjectSlug,
    id: string | number,
    fields: Record<string, unknown>,
  ) => Promise<void>;
  deleteEntity: (slug: ProjectSlug, id: string | number) => Promise<void>;
  deleteEntities: (slug: ProjectSlug, ids: Array<string | number>) => Promise<void>;
  entitiesUpdatedTrigger: number;
  triggerEntitiesUpdate: () => void;
  commodities: { id: number; name: string }[];
  centers: IdNamePair[];
  users: IdNamePair[];
  customers: IdNamePair[];
  rates: RateOption[];
  weighmentFiltersData: {
    centers: IdNamePair[];
    users: IdNamePair[];
    customers: IdNamePair[];
    rates: RateOption[];
  } | null;
  filtersLoading: boolean;
  filtersInitialized: boolean;
  preloadAllFilters: (options?: { silent?: boolean }) => Promise<void>;
}

export const useEntitiesStore = create<EntitiesState>((set, get) => ({
  entitiesUpdatedTrigger: 0,
  triggerEntitiesUpdate: () =>
    set((state) => ({ entitiesUpdatedTrigger: state.entitiesUpdatedTrigger + 1 })),
  filtersLoading: false,
  filtersInitialized: false,

  commodities: [],
  centers: [],
  users: [],
  customers: [],
  rates: [],
  weighmentFiltersData: null,

  preloadAllFilters: async (options) => {
    if (get().filtersLoading) return;
    set({ filtersLoading: true });
    const isSilent = options?.silent ?? false;
    const toastId =
      !isSilent && typeof toast?.loading === "function"
        ? toast.loading("Syncing data...", { id: "sync-data-toast" })
        : undefined;
    try {
      const res = await axios.get<PreloadPayload>("/api/filters/preload");
      const payload = res?.data;

      const rateOpts: RateOption[] = (payload?.rates || []).map((rate) => {
        return {
          id: rate.id,
          label: `${rate.commodity_name ?? "Rate"} · ₹${rate.unit_price}/${rate.unit} (ID: ${rate.id})`,
        };
      });

      const commodities = payload?.commodities || [];
      const centers = payload?.centers || [];
      const users = payload?.users || [];
      const customers = payload?.customers || [];

      set({
        commodities,
        centers,
        users,
        customers,
        rates: rateOpts,
        weighmentFiltersData: {
          centers,
          users,
          customers,
          rates: rateOpts,
        },
      });
      if (!isSilent) {
        if (toastId) {
          toast.success("Data synced successfully", { id: toastId });
        } else {
          toast.success("Data synced successfully");
        }
      }
      set({ filtersInitialized: true });
    } catch (err) {
      console.error("Failed to preload filters:", err);
      if (!isSilent) {
        if (toastId) {
          toast.error("Failed to sync data", { id: toastId });
        } else {
          toast.error("Failed to sync data");
        }
      }
    } finally {
      set({ filtersLoading: false });
    }
  },

  addEntity: async (slug, newE) => {
    const created = (await insertRow(slug, newE)) as unknown as Record<string, unknown> | undefined;
    const createdId = Number(created?.id || newE.id);
    const state = get();

    if (created && typeof created === "object") {
      const name = String(created.name || newE.name || "");

      switch (slug) {
        case ProjectSlug.COMMODITIES:
          if (createdId) {
            set({
              commodities: [
                ...state.commodities.filter((c) => c.id !== createdId),
                { id: createdId, name },
              ],
            });
          }
          break;
        case ProjectSlug.CENTERS:
          if (createdId) {
            const newCenters = [
              ...state.centers.filter((c) => c.id !== createdId),
              { id: createdId, name },
            ];
            set({
              centers: newCenters,
              weighmentFiltersData: state.weighmentFiltersData
                ? { ...state.weighmentFiltersData, centers: newCenters }
                : null,
            });
          }
          break;
        case ProjectSlug.USERS: {
          if (createdId) {
            const newUsers = [
              ...state.users.filter((u) => u.id !== createdId),
              { id: createdId, name },
            ];
            set({
              users: newUsers,
              weighmentFiltersData: state.weighmentFiltersData
                ? { ...state.weighmentFiltersData, users: newUsers }
                : null,
            });
          }
          break;
        }
        case ProjectSlug.CUSTOMERS:
          if (createdId) {
            const newCustomers = [
              ...state.customers.filter((c) => c.id !== createdId),
              { id: createdId, name },
            ];
            set({
              customers: newCustomers,
              weighmentFiltersData: state.weighmentFiltersData
                ? { ...state.weighmentFiltersData, customers: newCustomers }
                : null,
            });
          }
          break;
        case ProjectSlug.RATES: {
          if (createdId) {
            const commodityId = Number(created.commodity_id || newE.commodity_id);
            const foundCommodity = state.commodities.find((c) => c.id === commodityId);
            const commodityName = String(created.commodity_name || foundCommodity?.name || "Rate");
            const unitPrice = String(created.unit_price || newE.unit_price || "");
            const unit = String(created.unit || newE.unit || "");
            const label = `${commodityName} · ₹${unitPrice}/${unit} (ID: ${createdId})`;
            const newRates = [
              ...state.rates.filter((r) => r.id !== createdId),
              { id: createdId, label },
            ];

            set({
              rates: newRates,
              weighmentFiltersData: state.weighmentFiltersData
                ? { ...state.weighmentFiltersData, rates: newRates }
                : null,
            });
          }
          break;
        }
        default:
          break;
      }
    }

    get().triggerEntitiesUpdate();
  },

  updateEntity: async (slug, id, fields) => {
    const updated = (await updateRow(slug, Number(id), fields)) as unknown as
      | Record<string, unknown>
      | undefined;
    const targetId = Number(id);
    const state = get();

    if (updated && typeof updated === "object") {
      const name = String(updated.name || fields.name || "");

      switch (slug) {
        case ProjectSlug.COMMODITIES:
          set({
            commodities: state.commodities.map((c) =>
              c.id === targetId ? { id: targetId, name } : c,
            ),
          });
          break;
        case ProjectSlug.CENTERS: {
          const newCenters = state.centers.map((c) =>
            c.id === targetId ? { id: targetId, name } : c,
          );
          set({
            centers: newCenters,
            weighmentFiltersData: state.weighmentFiltersData
              ? { ...state.weighmentFiltersData, centers: newCenters }
              : null,
          });
          break;
        }
        case ProjectSlug.USERS: {
          const newUsers = state.users.map((u) => (u.id === targetId ? { id: targetId, name } : u));
          set({
            users: newUsers,
            weighmentFiltersData: state.weighmentFiltersData
              ? { ...state.weighmentFiltersData, users: newUsers }
              : null,
          });
          break;
        }
        case ProjectSlug.CUSTOMERS: {
          const newCustomers = state.customers.map((c) =>
            c.id === targetId ? { id: targetId, name } : c,
          );
          set({
            customers: newCustomers,
            weighmentFiltersData: state.weighmentFiltersData
              ? { ...state.weighmentFiltersData, customers: newCustomers }
              : null,
          });
          break;
        }
        case ProjectSlug.RATES: {
          const commodityId = Number(updated.commodity_id || fields.commodity_id);
          const foundCommodity = state.commodities.find((c) => c.id === commodityId);
          const commodityName = String(updated.commodity_name || foundCommodity?.name || "Rate");
          const unitPrice = String(updated.unit_price || fields.unit_price || "");
          const unit = String(updated.unit || fields.unit || "");
          const label = `${commodityName} · ₹${unitPrice}/${unit} (ID: ${targetId})`;
          const newRates = state.rates.map((r) =>
            r.id === targetId ? { id: targetId, label } : r,
          );

          set({
            rates: newRates,
            weighmentFiltersData: state.weighmentFiltersData
              ? { ...state.weighmentFiltersData, rates: newRates }
              : null,
          });
          break;
        }
        case ProjectSlug.SETTINGS:
          useFactoryStore.getState().fetchFactory();
          break;
        default:
          break;
      }
    }

    get().triggerEntitiesUpdate();
  },

  deleteEntity: async (slug, id) => {
    const targetId = Number(id);
    await deleteRow(slug, targetId);
    const state = get();

    switch (slug) {
      case ProjectSlug.COMMODITIES:
        set({ commodities: state.commodities.filter((c) => c.id !== targetId) });
        break;
      case ProjectSlug.CENTERS: {
        const newCenters = state.centers.filter((c) => c.id !== targetId);
        set({
          centers: newCenters,
          weighmentFiltersData: state.weighmentFiltersData
            ? { ...state.weighmentFiltersData, centers: newCenters }
            : null,
        });
        break;
      }
      case ProjectSlug.USERS: {
        const newUsers = state.users.filter((u) => u.id !== targetId);
        set({
          users: newUsers,
          weighmentFiltersData: state.weighmentFiltersData
            ? { ...state.weighmentFiltersData, users: newUsers }
            : null,
        });
        break;
      }
      case ProjectSlug.CUSTOMERS: {
        const newCustomers = state.customers.filter((c) => c.id !== targetId);
        set({
          customers: newCustomers,
          weighmentFiltersData: state.weighmentFiltersData
            ? { ...state.weighmentFiltersData, customers: newCustomers }
            : null,
        });
        break;
      }
      case ProjectSlug.RATES: {
        const newRates = state.rates.filter((r) => r.id !== targetId);
        set({
          rates: newRates,
          weighmentFiltersData: state.weighmentFiltersData
            ? { ...state.weighmentFiltersData, rates: newRates }
            : null,
        });
        break;
      }
      default:
        break;
    }

    get().triggerEntitiesUpdate();
  },

  deleteEntities: async (slug, ids) => {
    const uniqueIds = [...new Set(ids.map(Number))];
    await deleteRows(slug, uniqueIds);
    await get().preloadAllFilters({ silent: true });
    get().triggerEntitiesUpdate();
  },
}));
