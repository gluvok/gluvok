/**
 * @file components/projects/dialog/dynamic-fields.ts
 * @description Pure calculation of active form fields for entities based on lock matrix rules.
 */

import { type EntityRecord } from "@/types";
import { type FieldConfig, PROJECT_FIELDS } from "@/lib/fields";
import {
  ProjectSlug,
  FieldSpan,
  WeighmentType,
  EntryStatus,
  EntrySource,
} from "@/lib/constants/enums";
import { getField } from "@/lib/store";

/**
 * resolveDynamicFields
 * Returns the relevant field configuration list based on entity type and record state:
 * - Weighments: Filters out immutable fields if type or rate has already been assigned.
 * - Entries: Restricts editing based on approval status, auto-approval, customer assignment, and manual vs device source.
 */
export function resolveDynamicFields(
  projectSlug: string,
  isEdit: boolean,
  item?: EntityRecord | null,
): FieldConfig[] {
  const baseFields = PROJECT_FIELDS[projectSlug] || [];

  if (isEdit && projectSlug === ProjectSlug.WEIGHMENTS && item) {
    const typeVal = getField(item, "type");
    const rateIdVal = getField(item, "rate_id");
    const isTypeFixed =
      typeVal !== null &&
      typeVal !== undefined &&
      typeVal !== "" &&
      typeVal !== WeighmentType.UNASSIGNED;
    const isRateFixed = rateIdVal !== null && rateIdVal !== undefined && rateIdVal !== "";

    const canEditType = !isTypeFixed;
    const canEditRate = !isRateFixed;

    if (canEditType && canEditRate) {
      return baseFields;
    }
    if (canEditType) {
      return baseFields
        .filter((f) => f.key === "type")
        .map((f) => ({ ...f, span: FieldSpan.FULL }));
    }
    if (canEditRate) {
      return baseFields
        .filter((f) => f.key === "rate_id")
        .map((f) => ({ ...f, span: FieldSpan.FULL }));
    }
    return [];
  }

  if (isEdit && projectSlug === ProjectSlug.ENTRIES && item) {
    const status = getField(item, "status");
    if (status === EntryStatus.REJECTED) {
      return [];
    }

    const isAutoApproved = Boolean(getField(item, "auto_approved"));
    const detectedVehicle = getField(item, "detected_vehicle_number");
    const vehicleNumber = getField(item, "vehicle_number");
    const isEdited = Boolean(detectedVehicle && vehicleNumber && detectedVehicle !== vehicleNumber);
    const source = getField(item, "source");
    const customerId = getField(item, "customer_id");
    const isCustomerNull = customerId === null || customerId === undefined || customerId === "";
    const isApproved = status === EntryStatus.APPROVED || isAutoApproved;

    if (isApproved) {
      const canEditVehicle = isAutoApproved && !isEdited;
      const canEditCustomer = isCustomerNull;

      if (canEditVehicle && canEditCustomer) {
        return baseFields.filter((f) => f.key === "vehicle_number" || f.key === "customer_id");
      }
      if (canEditVehicle) {
        return baseFields
          .filter((f) => f.key === "vehicle_number")
          .map((f) => ({ ...f, span: FieldSpan.FULL }));
      }
      if (canEditCustomer) {
        return baseFields
          .filter((f) => f.key === "customer_id")
          .map((f) => ({ ...f, span: FieldSpan.FULL }));
      }
      return [];
    }

    if (status === EntryStatus.PENDING) {
      if (source === EntrySource.MANUAL) {
        return baseFields.filter((f) =>
          ["vehicle_number", "weight", "images", "center_id", "customer_id"].includes(f.key),
        );
      }
      return baseFields
        .filter((f) => f.key === "vehicle_number")
        .map((f) => ({ ...f, span: FieldSpan.FULL }));
    }
  }

  return baseFields;
}
