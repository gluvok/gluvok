/**
 * @file lib/store/entities.ts
 * @description Zustand state store for managing entity cache, on-demand filter fetching, and CUD operations.
 */

"use client";

import { create } from "zustand";
import axios from "axios";
import { ProjectSlug } from "@/lib/constants/enums";
import { insertRow, updateRow, deleteRow, deleteRows } from "@/lib/services/common";
import {
  type IdNamePair,
  type RateOption,
  applyAddEntity,
  applyUpdateEntity,
  applyDeleteEntities,
} from "./entities-cache";

export { type IdNamePair, type RateOption };

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
        data: { id: number; commodity_name: string; unit_price: string; unit: string }[];
      }>("/api/rates");
      const list = res.data.data || [];
      const rateOpts = list.map((r) => ({
        id: r.id,
        label: `${r.commodity_name || "Rate"} · ₹${r.unit_price || "0"}/${r.unit || "kg"} (ID: ${r.id})`,
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
    if (created && typeof created === "object") {
      const patch = applyAddEntity(get(), slug, created, newE);
      set(patch);
    }
    get().triggerEntitiesUpdate();
  },

  updateEntity: async (slug, id, fields) => {
    const updated = (await updateRow(slug, Number(id), fields)) as unknown as
      | Record<string, unknown>
      | undefined;
    if (updated && typeof updated === "object") {
      const patch = applyUpdateEntity(get(), slug, Number(id), updated, fields);
      set(patch);
    }
    get().triggerEntitiesUpdate();
  },

  deleteEntity: async (slug, id) => {
    const targetId = Number(id);
    await deleteRow(slug, targetId);
    const patch = applyDeleteEntities(get(), slug, [targetId]);
    set(patch);
    get().triggerEntitiesUpdate();
  },

  deleteEntities: async (slug, ids) => {
    const uniqueIds = [...new Set(ids.map(Number))];
    await deleteRows(slug, uniqueIds);
    const patch = applyDeleteEntities(get(), slug, uniqueIds);
    set(patch);
    get().triggerEntitiesUpdate();
  },
}));
