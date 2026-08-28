/**
 * @file components/projects/dialog/use-entity-form.ts
 * @description Dialog component or hook for managing use entity form actions.
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
  FieldSpan,
} from "@/lib/constants/enums";
import { PROJECT_FIELDS, getSingularName } from "@/lib/fields";
import {
  ENTITY_ADD_SCHEMAS,
  ENTITY_EDIT_SCHEMAS,
  checkEditUniqueness,
  getDynamicCustomerSchema,
  getDynamicUserSchema,
} from "@/lib/validation";
import {
  useEntitiesStore,
  useAuthStore,
  useFactoryStore,
  getField,
  hasPermission,
} from "@/lib/store";
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
  const factory = useFactoryStore((state) => state.factory);

  const fields = React.useMemo(() => {
    const baseFields = PROJECT_FIELDS[projectSlug] || [];
    if (isEdit && projectSlug === ProjectSlug.ENTRIES && item) {
      const status = getField(item, "status");
      if (status === EntryStatus.APPROVED) {
        return baseFields
          .filter((f) => f.key === "customer_id")
          .map((f) => ({ ...f, span: FieldSpan.FULL }));
      }
    }
    return baseFields;
  }, [projectSlug, isEdit, item]);

  const formSchema = React.useMemo(() => {
    if (projectSlug === ProjectSlug.CUSTOMERS) {
      return getDynamicCustomerSchema(factory);
    }
    if (projectSlug === ProjectSlug.USERS) {
      return getDynamicUserSchema(factory, isEdit);
    }
    return isEdit
      ? ENTITY_EDIT_SCHEMAS[projectSlug as ProjectSlug]
      : ENTITY_ADD_SCHEMAS[projectSlug as ProjectSlug];
  }, [isEdit, projectSlug, factory]);

  const form = useForm<FieldValues>({
    resolver: standardSchemaResolver(formSchema as never) as unknown as Resolver<FieldValues>,
    defaultValues: {},
  });

  const userFactoryId = currentUser?.factory_id ? String(currentUser.factory_id) : "";

  React.useEffect(() => {
    if (!open) return;

    if (isEdit) {
      if (!item) return;
      const defaults: Record<string, unknown> = {};
      fields.forEach((field) => {
        let rawVal = getField(item, field.key);
        if (field.transformOnChange && typeof rawVal === "string") {
          rawVal = field.transformOnChange(rawVal);
        }
        if (field.type === FieldType.CHECKBOX) {
          defaults[field.key] = String(rawVal) === "true";
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
      form.reset(defaults);
    } else {
      const defaultVals: Record<string, unknown> = {};

      if (userFactoryId && fields.some((f) => f.key === "factory_id")) {
        defaultVals["factory_id"] = userFactoryId;
      }

      form.reset(defaultVals);
    }
  }, [open, isEdit, item, fields, form, projectSlug, userFactoryId, currentUser]);

  const onSubmit = async (values: FieldValues) => {
    const singularName = getSingularName(projectName);
    try {
      if (isEdit) {
        if (!item) return;
        let updateValues: Record<string, unknown> = {};

        if (
          projectSlug === ProjectSlug.ENTRIES &&
          getField(item, "status") === EntryStatus.APPROVED
        ) {
          updateValues = {
            customer_id: values["customer_id"],
          };
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

  return { form, fields, onSubmit, isEdit, isUnchanged };
}
