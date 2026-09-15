/**
 * @file components/projects/dialog/trip-submit.ts
 * @description Handlers for vehicle change trip disambiguation and submit payload preparation.
 */

import { type FieldValues } from "react-hook-form";
import { type EntityRecord } from "@/types";
import { type FieldConfig } from "@/lib/fields";
import { ProjectSlug, EntryStatus, Role, PermissionKey } from "@/lib/constants/enums";
import { getField, hasPermission } from "@/lib/store";
import { checkEditUniqueness } from "@/lib/validation";
import { getPendingImageFile, releasePendingImage } from "@/components/form/image/upload";

/**
 * checkVehicleChangeOnLinkedEntry
 * Checks whether an entry edit changes the vehicle plate on an approved entry linked to a weighment.
 */
export async function checkVehicleChangeOnLinkedEntry(
  isEdit: boolean,
  item: EntityRecord | null | undefined,
  projectSlug: string,
  values: FieldValues,
  primaryIdKey: string,
): Promise<{ id: number; partner_entry_id: number } | null> {
  const isChangingVehicle = Boolean(
    isEdit &&
    item &&
    projectSlug === ProjectSlug.ENTRIES &&
    values["vehicle_number"] !== undefined &&
    values["vehicle_number"] !== getField(item, "vehicle_number"),
  );

  if (!isChangingVehicle || !item) return null;

  try {
    const res = await fetch(`/api/entries/${getField(item, primaryIdKey)}`);
    const json = await res.json();
    return json?.data?.linked_weighment || null;
  } catch {
    return null;
  }
}

export interface PreparedPayload {
  payload: Record<string, unknown>;
  uniquenessError?: { field: string; message: string };
}

/**
 * prepareSubmitPayload
 * Formats, cleans, validates, and processes file uploads for entity create/edit submissions.
 */
export async function prepareSubmitPayload(
  values: FieldValues,
  isEdit: boolean,
  projectSlug: string,
  item: EntityRecord | null | undefined,
  fields: FieldConfig[],
  currentUserRole: Role | undefined,
  updateBoth?: boolean,
): Promise<PreparedPayload> {
  if (!isEdit) {
    if (projectSlug === ProjectSlug.ENTRIES) {
      const formData = new FormData();
      Object.entries(values).forEach(([key, val]) => {
        if (key === "images") return;
        if (val !== undefined && val !== null && val !== "") {
          formData.append(key, String(val));
        }
      });

      if (Array.isArray(values["images"])) {
        for (const img of values["images"]) {
          if (typeof img === "string") {
            if (img.startsWith("blob:")) {
              const file = getPendingImageFile(img);
              if (file) {
                formData.append("files", file);
                releasePendingImage(img);
              }
            } else {
              formData.append("image_urls", img);
            }
          }
        }
      }

      return { payload: formData as unknown as Record<string, unknown> };
    }

    const payload = { ...values };
    return { payload };
  }

  if (!item) {
    return { payload: { ...values } };
  }

  let updateValues: Record<string, unknown> = {};

  const status = getField(item, "status");
  const isAutoApproved = Boolean(getField(item, "auto_approved"));
  const isApproved = status === EntryStatus.APPROVED || isAutoApproved;

  if (projectSlug === ProjectSlug.ENTRIES && isApproved) {
    updateValues = {};
    if (values["customer_id"] !== undefined) {
      updateValues["customer_id"] = values["customer_id"] ? Number(values["customer_id"]) : null;
    }
    if (values["vehicle_number"] !== undefined) {
      updateValues["vehicle_number"] = values["vehicle_number"];
    }
    if (updateBoth !== undefined) {
      updateValues["update_weighment_pair"] = updateBoth;
    }
  } else if (projectSlug === ProjectSlug.WEIGHMENTS) {
    updateValues = {};
    if (values["type"] !== undefined && values["type"] !== "") {
      updateValues["type"] = values["type"];
    }
    if (values["rate_id"] !== undefined && values["rate_id"] !== "") {
      updateValues["rate_id"] = Number(values["rate_id"]);
    }
  } else {
    updateValues = { ...values };
    fields.forEach((field) => {
      if (
        field.requiresEditPermission &&
        !hasPermission(currentUserRole, projectSlug, PermissionKey.EDIT_FIELD, field.key)
      ) {
        delete updateValues[field.key];
      }
    });

    const uniquenessError = checkEditUniqueness(projectSlug as ProjectSlug, item, updateValues);
    if (uniquenessError) {
      return { payload: updateValues, uniquenessError };
    }

    if (projectSlug === ProjectSlug.ENTRIES && Array.isArray(updateValues["images"])) {
      const formData = new FormData();
      Object.entries(updateValues).forEach(([key, val]) => {
        if (key === "images") return;
        if (val !== undefined && val !== null) {
          formData.append(key, String(val));
        }
      });

      for (const img of updateValues["images"]) {
        if (typeof img === "string") {
          if (img.startsWith("blob:")) {
            const file = getPendingImageFile(img);
            if (file) {
              formData.append("files", file);
              releasePendingImage(img);
            }
          } else {
            formData.append("image_urls", img);
          }
        }
      }

      return { payload: formData as unknown as Record<string, unknown> };
    }
  }

  return { payload: updateValues };
}
