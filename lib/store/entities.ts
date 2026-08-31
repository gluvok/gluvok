/**
 * @file lib/store/entities.ts
 * @description Zustand state store for managing entity cache, on-demand filter fetching, and CUD operations.
 */

"use client";

import { create } from "zustand";
import axios from "axios";
import { ProjectSlug } from "@/lib/constants/enums";
import { insertRow, updateRow, deleteRow, deleteRows } from "@/lib/services/common";

export interface IdNamePair {
  id: number;
  name: string;
}

export interface RateOption {
  id: number;
  label: string;
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

  commodities: IdNamePair[];
  centers: (IdNamePair & { auto_approve?: boolean })[];
  users: IdNamePair[];
  customers: IdNamePair[];
  rates: RateOption[];

  fetchCommodities: () => Promise<IdNamePair[]>;
  fetchCenters: () => Promise<(IdNamePair & { auto_approve?: boolean })[]>;
  fetchUsers: () => Promise<IdNamePair[]>;
  fetchCustomers: () => Promise<IdNamePair[]>;
  fetchRates: () => Promise<RateOption[]>;
}

export const useEntitiesStore = create<EntitiesState>((set, get) => ({
  entitiesUpdatedTrigger: 0,
  triggerEntitiesUpdate: () =>
    set((state) => ({ entitiesUpdatedTrigger: state.entitiesUpdatedTrigger + 1 })),

  commodities: [],
  centers: [],
  users: [],
  customers: [],
  rates: [],

  fetchCommodities: async () => {
    try {
      const res = await axios.get<{ data: { id: number; name: string }[] }>("/api/commodities");
      const commodities = res.data.data || [];
      set({ commodities });
      return commodities;
    } catch (err) {
      console.error("Failed to fetch commodities:", err);
      return get().commodities;
    }
  },

  fetchCenters: async () => {
    try {
      const res = await axios.get<{ data: { id: number; name: string; auto_approve?: boolean }[] }>(
        "/api/centers",
      );
      const centers = res.data.data || [];
      set({ centers });
      return centers;
    } catch (err) {
      console.error("Failed to fetch centers:", err);
      return get().centers;
    }
  },

  fetchUsers: async () => {
    try {
      const res = await axios.get<{ data: { id: number; name: string }[] }>("/api/users");
      const users = res.data.data || [];
      set({ users });
      return users;
    } catch (err) {
      console.error("Failed to fetch users:", err);
      return get().users;
    }
  },

  fetchCustomers: async () => {
    try {
      const res = await axios.get<{ data: { id: number; name: string }[] }>("/api/customers");
      const customers = res.data.data || [];
      set({ customers });
      return customers;
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      return get().customers;
    }
  },

  fetchRates: async () => {
    try {
      const res = await axios.get<{
        data: { id: number; unit_price: string; unit: string; commodity_name?: string }[];
      }>("/api/rates");
      const ratesData = res.data.data || [];
      const rateOpts: RateOption[] = ratesData.map((rate) => ({
        id: rate.id,
        label: `${rate.commodity_name ?? "Rate"} · ₹${rate.unit_price}/${rate.unit} (ID: ${rate.id})`,
      }));
      set({ rates: rateOpts });
      return rateOpts;
    } catch (err) {
      console.error("Failed to fetch rates:", err);
      return get().rates;
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
            set({
              centers: [
                ...state.centers.filter((c) => c.id !== createdId),
                { id: createdId, name, auto_approve: Boolean(created.auto_approve) },
              ],
            });
          }
          break;
        case ProjectSlug.USERS:
          if (createdId) {
            set({
              users: [...state.users.filter((u) => u.id !== createdId), { id: createdId, name }],
            });
          }
          break;
        case ProjectSlug.CUSTOMERS:
          if (createdId) {
            set({
              customers: [
                ...state.customers.filter((c) => c.id !== createdId),
                { id: createdId, name },
              ],
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

            set({
              rates: [...state.rates.filter((r) => r.id !== createdId), { id: createdId, label }],
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
        case ProjectSlug.CENTERS:
          set({
            centers: state.centers.map((c) =>
              c.id === targetId
                ? {
                    id: targetId,
                    name,
                    auto_approve:
                      updated.auto_approve !== undefined
                        ? Boolean(updated.auto_approve)
                        : c.auto_approve,
                  }
                : c,
            ),
          });
          break;
        case ProjectSlug.USERS:
          set({
            users: state.users.map((u) => (u.id === targetId ? { id: targetId, name } : u)),
          });
          break;
        case ProjectSlug.CUSTOMERS:
          set({
            customers: state.customers.map((c) => (c.id === targetId ? { id: targetId, name } : c)),
          });
          break;
        case ProjectSlug.RATES: {
          const commodityId = Number(updated.commodity_id || fields.commodity_id);
          const foundCommodity = state.commodities.find((c) => c.id === commodityId);
          const commodityName = String(updated.commodity_name || foundCommodity?.name || "Rate");
          const unitPrice = String(updated.unit_price || fields.unit_price || "");
          const unit = String(updated.unit || fields.unit || "");
          const label = `${commodityName} · ₹${unitPrice}/${unit} (ID: ${targetId})`;

          set({
            rates: state.rates.map((r) => (r.id === targetId ? { id: targetId, label } : r)),
          });
          break;
        }
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
      case ProjectSlug.CENTERS:
        set({ centers: state.centers.filter((c) => c.id !== targetId) });
        break;
      case ProjectSlug.USERS:
        set({ users: state.users.filter((u) => u.id !== targetId) });
        break;
      case ProjectSlug.CUSTOMERS:
        set({ customers: state.customers.filter((c) => c.id !== targetId) });
        break;
      case ProjectSlug.RATES:
        set({ rates: state.rates.filter((r) => r.id !== targetId) });
        break;
      default:
        break;
    }

    get().triggerEntitiesUpdate();
  },

  deleteEntities: async (slug, ids) => {
    const uniqueIds = [...new Set(ids.map(Number))];
    await deleteRows(slug, uniqueIds);
    const idSet = new Set(uniqueIds);
    const state = get();

    switch (slug) {
      case ProjectSlug.COMMODITIES:
        set({ commodities: state.commodities.filter((c) => !idSet.has(c.id)) });
        break;
      case ProjectSlug.CENTERS:
        set({ centers: state.centers.filter((c) => !idSet.has(c.id)) });
        break;
      case ProjectSlug.USERS:
        set({ users: state.users.filter((u) => !idSet.has(u.id)) });
        break;
      case ProjectSlug.CUSTOMERS:
        set({ customers: state.customers.filter((c) => !idSet.has(c.id)) });
        break;
      case ProjectSlug.RATES:
        set({ rates: state.rates.filter((r) => !idSet.has(r.id)) });
        break;
      default:
        break;
    }

    get().triggerEntitiesUpdate();
  },
}));
