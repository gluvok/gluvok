/**
 * @file components/projects/dialog/use-entity-form.ts
 * @description Master dialog hook managing entity form lifecycle, validation schemas, and trip disambiguation.
 */

"use client";

import * as React from "react";
import { useForm, type FieldValues, type Path, type Resolver } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { toast } from "sonner";
import { DialogMode, ProjectSlug } from "@/lib/constants/enums";
import { getSingularName } from "@/lib/fields";
import {
  ENTITY_ADD_SCHEMAS,
  ENTITY_EDIT_SCHEMAS,
  type EntityAddSchema,
  type EntityEditSchema,
} from "@/lib/validation";
import { useEntitiesStore, useAuthStore, getField } from "@/lib/store";
import { type EntityFormProps } from "./types";
import { resolveDynamicFields } from "./dynamic-fields";
import { buildEditDefaults, buildCreateDefaults } from "./form-defaults";
import { checkVehicleChangeOnLinkedEntry, prepareSubmitPayload } from "./trip-submit";

interface UseEntityFormProps extends EntityFormProps {
  mode: DialogMode;
  item?: import("@/types").EntityRecord | null;
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
  const isView = mode === DialogMode.VIEW;

  const addEntity = useEntitiesStore((state) => state.addEntity);
  const updateEntity = useEntitiesStore((state) => state.updateEntity);
  const currentUser = useAuthStore((state) => state.user);

  const [linkedWeighment, setLinkedWeighment] = React.useState<{
    id: number;
    partner_entry_id: number;
  } | null>(null);
  const [tripModalOpen, setTripModalOpen] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<FieldValues | null>(null);

  const fields = React.useMemo(() => {
    return resolveDynamicFields(projectSlug, isEdit, item);
  }, [projectSlug, isEdit, item]);

  const formSchema = React.useMemo(() => {
    if (isView) return z.object({});
    return isEdit
      ? (ENTITY_EDIT_SCHEMAS as Record<string, EntityEditSchema>)[projectSlug]
      : (ENTITY_ADD_SCHEMAS as Record<string, EntityAddSchema>)[projectSlug];
  }, [isEdit, isView, projectSlug]);

  const form = useForm<FieldValues>({
    resolver: standardSchemaResolver(formSchema as never) as unknown as Resolver<FieldValues>,
    defaultValues: {},
  });

  const userFactoryId = currentUser?.factory_id ? String(currentUser.factory_id) : "";

  React.useEffect(() => {
    if (!open) return;

    let active = true;

    async function initializeForm() {
      if (isEdit && item) {
        const defaults = buildEditDefaults(fields, item);
        if (active) form.reset(defaults);
      } else {
        const defaultVals = await buildCreateDefaults(fields, projectSlug, userFactoryId, item);
        if (active) form.reset(defaultVals);
      }

      if (!open) {
        setLinkedWeighment(null);
        setPendingValues(null);
      }
    }

    initializeForm();

    return () => {
      active = false;
    };
  }, [open, isEdit, item, fields, form, projectSlug, userFactoryId]);

  const executeSubmit = async (values: FieldValues, updateBoth?: boolean) => {
    const singularName = getSingularName(projectName);
    try {
      const { payload, uniquenessError } = await prepareSubmitPayload(
        values,
        isEdit,
        projectSlug,
        item,
        fields,
        currentUser?.role,
        updateBoth,
      );

      if (uniquenessError) {
        form.setError(uniquenessError.field as Path<FieldValues>, {
          message: uniquenessError.message,
        });
        return;
      }

      if (isEdit && item) {
        const updatedResult = await updateEntity(
          projectSlug as ProjectSlug,
          String(getField(item, primaryIdKey)),
          payload,
        );

        const isSelfPasswordChange = Boolean(
          projectSlug === ProjectSlug.USERS &&
          currentUser &&
          String(getField(item, primaryIdKey)) === String(currentUser.id) &&
          ((payload &&
            typeof payload === "object" &&
            "password" in payload &&
            (payload as { password?: string }).password) ||
            (updatedResult &&
              typeof updatedResult === "object" &&
              (updatedResult as Record<string, unknown>).is_self_password_changed)),
        );

        if (isSelfPasswordChange) {
          toast.success("Password changed successfully. Please log in with your new password.");
          onOpenChange(false);
          useAuthStore.setState({ user: null });
          window.location.href = "/login";
          return;
        }

        toast.success(
          updateBoth
            ? `${singularName} and paired weighment trip updated successfully`
            : `${singularName} updated successfully`,
        );
      } else {
        await addEntity(projectSlug as ProjectSlug, payload);
        toast.success(
          projectSlug === ProjectSlug.TICKETS
            ? "Ticket raised successfully"
            : `${singularName} created successfully`,
        );
      }
      onOpenChange(false);
    } catch (err) {
      const action = isEdit ? "update" : "create";
      const msg =
        err instanceof Error ? err.message : `Failed to ${action} ${singularName.toLowerCase()}`;
      toast.error(msg);
    }
  };

  const onSubmit = async (values: FieldValues) => {
    const linked = await checkVehicleChangeOnLinkedEntry(
      isEdit,
      item,
      projectSlug,
      values,
      primaryIdKey,
    );

    if (linked) {
      setLinkedWeighment(linked);
      setPendingValues(values);
      setTripModalOpen(true);
      return;
    }

    await executeSubmit(values);
  };

  const handleConfirmTripChoice = async (updateBoth: boolean) => {
    if (!pendingValues) return;
    const values = { ...pendingValues };
    try {
      await executeSubmit(values, updateBoth);
    } finally {
      setTripModalOpen(false);
      setPendingValues(null);
    }
  };

  const isUnchanged = isEdit && !form.formState.isDirty;

  return {
    form,
    fields,
    onSubmit,
    isEdit,
    isView,
    isUnchanged,
    item,
    linkedWeighment,
    pendingValues,
    tripModalOpen,
    setTripModalOpen,
    handleConfirmTripChoice,
  };
}
