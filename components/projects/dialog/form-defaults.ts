/**
 * @file components/projects/dialog/form-defaults.ts
 * @description Helpers for calculating default values and applying auto-selections in entity form dialogs.
 */

import { type EntityRecord } from "@/types";
import { type FieldConfig } from "@/lib/fields";
import { FieldType, ProjectSlug } from "@/lib/constants/enums";
import { getField, useEntitiesStore } from "@/lib/store";

/**
 * buildEditDefaults
 * Populates form defaults from an existing entity row.
 */
export function buildEditDefaults(
  fields: FieldConfig[],
  item: EntityRecord,
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  fields.forEach((field) => {
    let rawVal = getField(item, field.key);
    if (field.transformOnChange && typeof rawVal === "string") {
      rawVal = field.transformOnChange(rawVal);
    }
    if (field.type === FieldType.CHECKBOX || field.type === FieldType.SWITCH) {
      defaults[field.key] = rawVal === true || String(rawVal) === "true";
    } else if (field.key === "password" || field.key === "confirmPassword") {
      defaults[field.key] = "";
    } else {
      defaults[field.key] = Array.isArray(rawVal)
        ? rawVal
        : rawVal !== undefined && rawVal !== null
          ? String(rawVal)
          : "";
    }
  });

  return defaults;
}

/**
 * buildCreateDefaults
 * Generates initial empty values and applies single-option auto-selections from entity stores.
 */
export async function buildCreateDefaults(
  fields: FieldConfig[],
  projectSlug: string,
  userFactoryId: string,
  item?: EntityRecord | null,
): Promise<Record<string, unknown>> {
  const defaultVals: Record<string, unknown> = {};

  fields.forEach((field) => {
    if (field.type === FieldType.CHECKBOX || field.type === FieldType.SWITCH) {
      defaultVals[field.key] = false;
    } else if (field.key === "factory_id" && userFactoryId) {
      defaultVals["factory_id"] = userFactoryId;
    } else {
      defaultVals[field.key] = "";
    }
  });

  // Parallel fetch reference options & apply single item auto-selection
  if (projectSlug === ProjectSlug.ENTRIES) {
    const [fetchedCenters, fetchedCustomers] = await Promise.all([
      useEntitiesStore.getState().fetchCenters(),
      useEntitiesStore.getState().fetchCustomers(),
    ]);

    if (fetchedCenters.length === 1) {
      defaultVals["center_id"] = String(fetchedCenters[0].id);
    }
    if (fetchedCustomers.length === 1) {
      defaultVals["customer_id"] = String(fetchedCustomers[0].id);
    }
  } else if (projectSlug === ProjectSlug.RATES) {
    const fetchedCommodities = await useEntitiesStore.getState().fetchCommodities();
    if (fetchedCommodities.length === 1) {
      defaultVals["commodity_id"] = String(fetchedCommodities[0].id);
    }
  } else if (projectSlug === ProjectSlug.WEIGHMENTS) {
    const fetchedRates = await useEntitiesStore.getState().fetchRates();
    if (fetchedRates.length === 1 && !defaultVals["rate_id"]) {
      defaultVals["rate_id"] = String(fetchedRates[0].id);
    }
  } else if (projectSlug === ProjectSlug.TICKETS && item) {
    const itemId = Number(getField(item, "id"));
    const isWeighment =
      getField(item, "net_weight") !== undefined ||
      getField(item, "in_entry_id") !== undefined ||
      getField(item, "gross_weight") !== undefined;
    if (isWeighment) {
      defaultVals["weighment_id"] = itemId;
    } else {
      defaultVals["entry_id"] = itemId;
    }
  }

  return defaultVals;
}
