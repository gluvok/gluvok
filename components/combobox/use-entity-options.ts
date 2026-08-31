/**
 * @file components/combobox/use-entity-options.ts
 * @description Hook to fetch list records for a given entity slug and format them into combobox options.
 */

import * as React from "react";
import { ENTITY_EXTRACTORS, type Entity } from "@/lib/utils/entity-extractors";
import { fetchEntityList } from "@/lib/services";
import { ProjectSlug } from "@/lib/constants/enums";
import { useEntitiesStore } from "@/lib/store";

export function useEntityOptions(
  entitySlug: string,
  contextSlug?: string,
  fieldKey?: string,
  currentValue?: string,
) {
  const storeCommodities = useEntitiesStore((state) => state.commodities);
  const storeCenters = useEntitiesStore((state) => state.centers);
  const storeUsers = useEntitiesStore((state) => state.users);
  const storeCustomers = useEntitiesStore((state) => state.customers);
  const storeRates = useEntitiesStore((state) => state.rates);

  const cachedOptions = React.useMemo(() => {
    switch (entitySlug) {
      case ProjectSlug.COMMODITIES:
        if (storeCommodities && storeCommodities.length > 0) {
          return storeCommodities.map((c) => ({
            value: String(c.id),
            label: c.name ? `${c.name} (ID: ${c.id})` : String(c.id),
          }));
        }
        return null;
      case ProjectSlug.CENTERS:
        if (storeCenters && storeCenters.length > 0) {
          return storeCenters.map((c) => ({
            value: String(c.id),
            label: c.name ? `${c.name} (ID: ${c.id})` : String(c.id),
          }));
        }
        return null;
      case ProjectSlug.USERS:
        if (storeUsers && storeUsers.length > 0) {
          return storeUsers.map((p) => ({
            value: String(p.id),
            label: p.name ? `${p.name} (ID: ${p.id})` : String(p.id),
          }));
        }
        return null;
      case ProjectSlug.CUSTOMERS:
        if (storeCustomers && storeCustomers.length > 0) {
          return storeCustomers.map((c) => ({
            value: String(c.id),
            label: c.name ? `${c.name} (ID: ${c.id})` : String(c.id),
          }));
        }
        return null;
      case ProjectSlug.RATES:
        if (storeRates && storeRates.length > 0) {
          return storeRates.map((r) => ({
            value: String(r.id),
            label: r.label,
          }));
        }
        return null;
      default:
        return null;
    }
  }, [entitySlug, storeCommodities, storeCenters, storeUsers, storeCustomers, storeRates]);

  const [apiOptions, setApiOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [apiLoading, setApiLoading] = React.useState(false);

  React.useEffect(() => {
    if (cachedOptions) return;

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
  }, [entitySlug, contextSlug, fieldKey, currentValue, cachedOptions]);

  const options = cachedOptions || apiOptions;
  const loading = !cachedOptions && apiLoading;

  return { options, loading };
}
