/**
 * @file lib/store/entities-cache.ts
 * @description State mutation helpers for updating cached entities (commodities, centers, users, customers, rates).
 */

import { ProjectSlug } from "@/lib/constants/enums";

export interface IdNamePair {
  id: number;
  name: string;
}

export interface RateOption {
  id: number;
  label: string;
}

export interface CacheCollections {
  commodities: IdNamePair[];
  centers: (IdNamePair & { auto_approve?: boolean })[];
  users: IdNamePair[];
  customers: IdNamePair[];
  rates: RateOption[];
}

export function applyAddEntity(
  state: CacheCollections,
  slug: ProjectSlug,
  created: Record<string, unknown>,
  fallback: Record<string, unknown>,
): Partial<CacheCollections> {
  const createdId = Number(created?.id || fallback.id);
  if (!createdId) return {};
  const name = String(created.name || fallback.name || "");

  switch (slug) {
    case ProjectSlug.COMMODITIES:
      return {
        commodities: [
          ...state.commodities.filter((c) => c.id !== createdId),
          { id: createdId, name },
        ],
      };
    case ProjectSlug.CENTERS:
      return {
        centers: [
          ...state.centers.filter((c) => c.id !== createdId),
          { id: createdId, name, auto_approve: Boolean(created.auto_approve) },
        ],
      };
    case ProjectSlug.USERS:
      return {
        users: [...state.users.filter((u) => u.id !== createdId), { id: createdId, name }],
      };
    case ProjectSlug.CUSTOMERS:
      return {
        customers: [...state.customers.filter((c) => c.id !== createdId), { id: createdId, name }],
      };
    case ProjectSlug.RATES: {
      const commodityId = Number(created.commodity_id || fallback.commodity_id);
      const foundCommodity = state.commodities.find((c) => c.id === commodityId);
      const commodityName = String(created.commodity_name || foundCommodity?.name || "Rate");
      const unitPrice = String(created.unit_price || fallback.unit_price || "");
      const unit = String(created.unit || fallback.unit || "");
      const label = `${commodityName} · ₹${unitPrice}/${unit} (ID: ${createdId})`;
      return {
        rates: [...state.rates.filter((r) => r.id !== createdId), { id: createdId, label }],
      };
    }
    default:
      return {};
  }
}

export function applyUpdateEntity(
  state: CacheCollections,
  slug: ProjectSlug,
  targetId: number,
  updated: Record<string, unknown>,
  fields: Record<string, unknown>,
): Partial<CacheCollections> {
  const name = String(updated.name || fields.name || "");

  switch (slug) {
    case ProjectSlug.COMMODITIES:
      return {
        commodities: state.commodities.map((c) => (c.id === targetId ? { id: targetId, name } : c)),
      };
    case ProjectSlug.CENTERS:
      return {
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
      };
    case ProjectSlug.USERS:
      return {
        users: state.users.map((u) => (u.id === targetId ? { id: targetId, name } : u)),
      };
    case ProjectSlug.CUSTOMERS:
      return {
        customers: state.customers.map((c) => (c.id === targetId ? { id: targetId, name } : c)),
      };
    case ProjectSlug.RATES: {
      const commodityId = Number(updated.commodity_id || fields.commodity_id);
      const foundCommodity = state.commodities.find((c) => c.id === commodityId);
      const commodityName = String(updated.commodity_name || foundCommodity?.name || "Rate");
      const unitPrice = String(updated.unit_price || fields.unit_price || "");
      const unit = String(updated.unit || fields.unit || "");
      const label = `${commodityName} · ₹${unitPrice}/${unit} (ID: ${targetId})`;
      return {
        rates: state.rates.map((r) => (r.id === targetId ? { id: targetId, label } : r)),
      };
    }
    default:
      return {};
  }
}

export function applyDeleteEntities(
  state: CacheCollections,
  slug: ProjectSlug,
  idsToRemove: number[],
): Partial<CacheCollections> {
  const idSet = new Set(idsToRemove);

  switch (slug) {
    case ProjectSlug.COMMODITIES:
      return { commodities: state.commodities.filter((c) => !idSet.has(c.id)) };
    case ProjectSlug.CENTERS:
      return { centers: state.centers.filter((c) => !idSet.has(c.id)) };
    case ProjectSlug.USERS:
      return { users: state.users.filter((u) => !idSet.has(u.id)) };
    case ProjectSlug.CUSTOMERS:
      return { customers: state.customers.filter((c) => !idSet.has(c.id)) };
    case ProjectSlug.RATES:
      return { rates: state.rates.filter((r) => !idSet.has(r.id)) };
    default:
      return {};
  }
}
