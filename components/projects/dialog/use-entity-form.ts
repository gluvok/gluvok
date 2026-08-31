/**
 * @file components/projects/dialog/use-entity-form.ts
 * @description Dialog component hook for managing entity form actions, validation schemas, and auto-selection.
 */

"use client";

import * as React from "react";
import { useForm, type FieldValues, type Path, type Resolver } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { toast } from "sonner";
import { type EntityRecord } from "@/types";
import {
  DialogMode,
  ProjectSlug,
  FieldType,
  PermissionKey,
  EntryStatus,
  EntryType,
  FieldSpan,
} from "@/lib/constants/enums";
import { PROJECT_FIELDS, getSingularName } from "@/lib/fields";
import { ENTITY_ADD_SCHEMAS, ENTITY_EDIT_SCHEMAS, checkEditUniqueness } from "@/lib/validation";
import { useEntitiesStore, useAuthStore, getField, hasPermission } from "@/lib/store";
import { type EntityFormProps } from "./types";
import { processImageUploadsAndDeletions } from "@/components/form/image/upload";

interface UseEntityFormProps extends EntityFormProps {
  mode: DialogMode;
  item?: EntityRecord | null;
}

export function useEntityForm({
  mode,
  open,
  onOpenChange,
  projectSlug,
  projectName,
  primaryIdKey,
  item,
}: UseEntityFormProps) {
  const isEdit = mode === DialogMode.EDIT;

  const addEntity = useEntitiesStore((state) => state.addEntity);
  const updateEntity = useEntitiesStore((state) => state.updateEntity);
  const currentUser = useAuthStore((state) => state.user);

  const fields = React.useMemo(() => {
    const baseFields = PROJECT_FIELDS[projectSlug] || [];
    if (isEdit && projectSlug === ProjectSlug.ENTRIES && item) {
      const status = getField(item, "status");
      if (status === EntryStatus.REJECTED) {
        return [];
      }

      const isAutoApproved = Boolean(getField(item, "auto_approved"));
      const isEdited = Boolean(getField(item, "edited"));
      const type = getField(item, "type");
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
        if (type === EntryType.MANUAL) {
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
  }, [projectSlug, isEdit, item]);

  const formSchema = React.useMemo(() => {
    return isEdit
      ? ENTITY_EDIT_SCHEMAS[projectSlug as ProjectSlug]
      : ENTITY_ADD_SCHEMAS[projectSlug as ProjectSlug];
  }, [isEdit, projectSlug]);

  const form = useForm<FieldValues>({
    resolver: standardSchemaResolver(formSchema as never) as unknown as Resolver<FieldValues>,
    defaultValues: {},
  });

  const userFactoryId = currentUser?.factory_id ? String(currentUser.factory_id) : "";

  React.useEffect(() => {
    if (!open) return;

    let active = true;

    async function initializeForm() {
      if (isEdit) {
        if (!item) return;
        const defaults: Record<string, unknown> = {};
        fields.forEach((field) => {
          let rawVal = getField(item, field.key);
          if (field.transformOnChange && typeof rawVal === "string") {
            rawVal = field.transformOnChange(rawVal);
          }
          if (field.type === FieldType.CHECKBOX) {
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
        if (active) form.reset(defaults);
      } else {
        const defaultVals: Record<string, unknown> = {};

        fields.forEach((field) => {
          if (field.type === FieldType.CHECKBOX) {
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
        }

        if (active) form.reset(defaultVals);
      }
    }

    initializeForm();

    return () => {
      active = false;
    };
  }, [open, isEdit, item, fields, form, projectSlug, userFactoryId, currentUser]);

  const onSubmit = async (values: FieldValues) => {
    const singularName = getSingularName(projectName);
    try {
      if (isEdit) {
        if (!item) return;
        let updateValues: Record<string, unknown> = {};

        const status = getField(item, "status");
        const isAutoApproved = Boolean(getField(item, "auto_approved"));
        const isApproved = status === EntryStatus.APPROVED || isAutoApproved;

        if (projectSlug === ProjectSlug.ENTRIES && isApproved) {
          updateValues = {};
          if (values["customer_id"] !== undefined) {
            updateValues["customer_id"] = values["customer_id"]
              ? Number(values["customer_id"])
              : null;
          }
          if (values["vehicle_number"] !== undefined) {
            updateValues["vehicle_number"] = values["vehicle_number"];
          }
        } else {
          updateValues = { ...values };
          fields.forEach((field) => {
            if (
              field.requiresEditPermission &&
              !hasPermission(currentUser?.role, projectSlug, PermissionKey.EDIT_FIELD, field.key)
            ) {
              delete updateValues[field.key];
            }
          });
          const uniquenessError = checkEditUniqueness(
            projectSlug as ProjectSlug,
            item,
            updateValues,
          );
          if (uniquenessError) {
            form.setError(uniquenessError.field as Path<FieldValues>, {
              message: uniquenessError.message,
            });
            return;
          }

          if (Array.isArray(updateValues["images"])) {
            const originalImages = (getField(item, "images") || []) as string[];
            updateValues["images"] = await processImageUploadsAndDeletions(
              updateValues["images"],
              originalImages,
            );
          }
        }

        await updateEntity(
          projectSlug as ProjectSlug,
          String(getField(item, primaryIdKey)),
          updateValues,
        );
        toast.success(`${singularName} updated successfully`);
      } else {
        if (Array.isArray(values["images"])) {
          values["images"] = await processImageUploadsAndDeletions(values["images"], []);
        }
        await addEntity(projectSlug as ProjectSlug, values);
        toast.success(`${singularName} created successfully`);
      }
      onOpenChange(false);
    } catch (err) {
      const action = isEdit ? "update" : "create";
      const msg =
        err instanceof Error ? err.message : `Failed to ${action} ${singularName.toLowerCase()}`;
      toast.error(msg);
    }
  };

  const isUnchanged = isEdit && !form.formState.isDirty;

  return { form, fields, onSubmit, isEdit, isUnchanged, item };
}
