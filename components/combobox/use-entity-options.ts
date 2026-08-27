/**
 * @file components/combobox/use-entity-options.ts
 * @description Hook to fetch list records for a given entity slug and format them into combobox options.
 */

import * as React from "react";
import { ENTITY_EXTRACTORS, type Entity } from "@/lib/utils/entity-extractors";
import { fetchEntityList } from "@/lib/services";
import { ProjectSlug } from "@/lib/constants/enums";
import { useEntitiesStore } from "@/lib/store";

/**
 * useEntityOptions Hook
 * Returns options directly from the preloaded Zustand entities store when available,
 * or performs an API fallback request for dynamic entities.
 */
export function useEntityOptions(
  entitySlug: string,
  contextSlug?: string,
  fieldKey?: string,
  currentValue?: string,
) {
  const storeCommodities = useEntitiesStore((state) => state.commodities);
  const weighmentFiltersData = useEntitiesStore((state) => state.weighmentFiltersData);

  const preloadedOptions = React.useMemo(() => {
    switch (entitySlug) {
      case ProjectSlug.COMMODITIES:
        if (storeCommodities && storeCommodities.length > 0) {
          return storeCommodities.map((c) => ({
            value: String(c.id),
            label: c.name ? `${c.name} (ID: ${c.id})` : String(c.id),
          }));
        }
        break;
      case ProjectSlug.CENTERS:
        if (weighmentFiltersData?.centers && weighmentFiltersData.centers.length > 0) {
          return weighmentFiltersData.centers.map((c) => ({
            value: String(c.id),
            label: c.name ? `${c.name} (ID: ${c.id})` : String(c.id),
          }));
        }
        break;
      case ProjectSlug.USERS: {
        const usersList = weighmentFiltersData?.users;
        if (usersList && usersList.length > 0) {
          return usersList.map((p) => ({
            value: String(p.id),
            label: p.name ? `${p.name} (ID: ${p.id})` : String(p.id),
          }));
        }
        break;
      }
      case ProjectSlug.CUSTOMERS:
        if (weighmentFiltersData?.customers && weighmentFiltersData.customers.length > 0) {
          return weighmentFiltersData.customers.map((c) => ({
            value: String(c.id),
            label: c.name ? `${c.name} (ID: ${c.id})` : String(c.id),
          }));
        }
        break;
      case ProjectSlug.RATES:
        if (weighmentFiltersData?.rates && weighmentFiltersData.rates.length > 0) {
          return weighmentFiltersData.rates.map((r) => ({
            value: String(r.id),
            label: r.label,
          }));
        }
        break;
      default:
        break;
    }
    return null;
  }, [entitySlug, storeCommodities, weighmentFiltersData]);

  const [apiOptions, setApiOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [apiLoading, setApiLoading] = React.useState(false);

  React.useEffect(() => {
    if (preloadedOptions) return;

    let active = true;
    async function load() {
      try {
        setApiLoading(true);
        const rawList: Entity[] = await fetchEntityList(entitySlug);

        if (!active) return;

        const extractor = ENTITY_EXTRACTORS[entitySlug];
        if (!extractor) {
          setApiOptions([]);
          return;
        }

        const opts = rawList.map((item) => {
          const { id, name } = extractor(item);
          const displayId = id.length > 8 ? `${id.substring(0, 8)}...` : id;
          return {
            value: id,
            label: name === id ? name : name ? `${name} (ID: ${displayId})` : id,
          };
        });
        setApiOptions(opts);
      } catch (err) {
        console.error("Failed to load options for", entitySlug, err);
      } finally {
        if (active) setApiLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [entitySlug, contextSlug, fieldKey, currentValue, preloadedOptions]);

  const options = preloadedOptions || apiOptions;
  const loading = !preloadedOptions && apiLoading;

  return { options, loading };
}
