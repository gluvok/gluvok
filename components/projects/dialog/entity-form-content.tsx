"use client";

/**
 * @file components/projects/dialog/entity-form-content.tsx
 * @description Form layout, field groups, dynamic grid rendering, and submission actions for EntityDialog.
 */

import React from "react";
import { Pencil, Plus, Save, X, Loader2, Ticket, Scale, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormFieldInput } from "@/components/form";
import { type EntityDialogContentProps } from "./types";
import {
  FieldSpan,
  ProjectSlug,
  EntryStatus,
  EntrySource,
  WeighmentType,
} from "@/lib/constants/enums";
import { type FieldConfig, getSingularName } from "@/lib/fields";
import { useAuthStore, isFieldVisible, isFieldRequired, getField } from "@/lib/store";

export function EntityFormContent({
  mode,
  onOpenChange,
  projectName,
  projectSlug,
  isEdit,
  isUnchanged,
  fields,
  form,
  onSubmit,
  item,
}: EntityDialogContentProps) {
  const currentUser = useAuthStore((state) => state.user);

  let Icon = isEdit ? Pencil : Plus;
  const singularName = getSingularName(projectName);
  let desc = isEdit
    ? "Update the attributes of this record. Click save when done."
    : `Enter the details for the new ${singularName.toLowerCase()}. Click save when done.`;

  let titleText = isEdit ? "Edit" : "Add";
  let submitButtonText = "Save";

  if (projectSlug === ProjectSlug.TICKETS) {
    Icon = Ticket;
    if (!isEdit) {
      titleText = "Raise Ticket";
      desc = "Submit a concern or request a manual review for this record.";
      submitButtonText = "Raise Ticket";
    } else {
      titleText = "Edit Ticket Concern";
      desc = "Update your submitted concern. Click save when done.";
    }
  }

  const renderField = (field: FieldConfig) => {
    let entryFieldDisabled = false;
    if (isEdit && projectSlug === ProjectSlug.WEIGHMENTS && item) {
      const typeVal = getField(item, "type");
      const rateIdVal = getField(item, "rate_id");
      const isTypeFixed =
        typeVal !== null &&
        typeVal !== undefined &&
        typeVal !== "" &&
        typeVal !== WeighmentType.UNASSIGNED;
      const isRateFixed = rateIdVal !== null && rateIdVal !== undefined && rateIdVal !== "";

      if (field.key === "type") {
        entryFieldDisabled = isTypeFixed;
      } else if (field.key === "rate_id") {
        entryFieldDisabled = isRateFixed;
      }
    }

    if (isEdit && projectSlug === ProjectSlug.ENTRIES && item) {
      const entryStatus = getField(item, "status") as EntryStatus | string;
      const isAutoApproved = Boolean(getField(item, "auto_approved"));
      const detectedVehicle = getField(item, "detected_vehicle_number");
      const vehicleNumber = getField(item, "vehicle_number");
      const isEdited = Boolean(
        detectedVehicle && vehicleNumber && detectedVehicle !== vehicleNumber,
      );
      const customerId = getField(item, "customer_id");
      const source = getField(item, "source") as EntrySource | string;
      const isApproved = entryStatus === EntryStatus.APPROVED || isAutoApproved;
      const hasCustomer = customerId !== null && customerId !== undefined && customerId !== "";

      if (isApproved) {
        const canEditVehicle = isAutoApproved && !isEdited;
        const canEditCustomer = !hasCustomer;

        if (field.key === "vehicle_number") {
          entryFieldDisabled = !canEditVehicle;
        } else if (field.key === "customer_id") {
          entryFieldDisabled = !canEditCustomer;
        } else {
          entryFieldDisabled = true;
        }
      } else if (entryStatus === EntryStatus.PENDING) {
        if (source === EntrySource.MANUAL) {
          entryFieldDisabled = false;
        } else {
          entryFieldDisabled = field.key !== "vehicle_number";
        }
      } else if (entryStatus === EntryStatus.REJECTED) {
        entryFieldDisabled = true;
      }
    }

    const isVisible = isFieldVisible(currentUser?.role, projectSlug, field.key);
    if (!isVisible) return null;

    const isRequired = isFieldRequired(projectSlug, field.key, field.required);

    return (
      <div key={field.key} className="space-y-1">
        <FormFieldInput
          field={{ ...field, required: isRequired }}
          form={form}
          idPrefix={mode}
          disabled={entryFieldDisabled}
        />
        {form.formState.errors[field.key] && (
          <p className="text-destructive text-xs">
            {form.formState.errors[field.key]?.message as string}
          </p>
        )}
      </div>
    );
  };

  const fieldGroups: { span: FieldSpan; fields: FieldConfig[] }[] = [];
  let currentGroup: FieldConfig[] = [];
  let currentGroupSpan: FieldSpan | null = null;

  const flushGroup = () => {
    if (currentGroup.length > 0 && currentGroupSpan !== null) {
      fieldGroups.push({ span: currentGroupSpan, fields: currentGroup });
      currentGroup = [];
      currentGroupSpan = null;
    }
  };

  fields.forEach((field) => {
    const isVisible = isFieldVisible(currentUser?.role, projectSlug, field.key);
    if (!isVisible) return;

    const fieldSpan = field.span || FieldSpan.FULL;

    if (fieldSpan === FieldSpan.FULL) {
      flushGroup();
      fieldGroups.push({ span: FieldSpan.FULL, fields: [field] });
    } else {
      if (currentGroupSpan !== null && currentGroupSpan !== fieldSpan) {
        flushGroup();
      }
      currentGroupSpan = fieldSpan;
      currentGroup.push(field);
    }
  });
  flushGroup();

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-foreground">
          <Icon className="h-4 w-4 text-primary" /> {titleText}
        </DialogTitle>
        <DialogDescription>{desc}</DialogDescription>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        {projectSlug === ProjectSlug.TICKETS && item && !isEdit && (
          <div className="p-3 rounded-lg border border-border/70 bg-muted/30 flex items-center gap-2.5 text-xs">
            {getField(item, "net_weight") !== undefined ||
            getField(item, "in_entry_id") !== undefined ? (
              <>
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <Scale className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    Linked to Weighment #{String(getField(item, "id"))}
                  </div>
                  {getField(item, "vehicle_number") ? (
                    <div className="text-muted-foreground font-mono text-2xs">
                      Vehicle Plate: {String(getField(item, "vehicle_number"))}
                    </div>
                  ) : null}
                </div>
              </>
            ) : getField(item, "weight") !== undefined ||
              getField(item, "vehicle_number") !== undefined ? (
              <>
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    Linked to Entry #{String(getField(item, "id"))}
                  </div>
                  {getField(item, "vehicle_number") ? (
                    <div className="text-muted-foreground font-mono text-2xs">
                      Vehicle Plate: {String(getField(item, "vehicle_number"))} ·{" "}
                      {String(getField(item, "weight"))} kg
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        )}
        {fieldGroups.map((group, groupIdx) => {
          if (group.span === FieldSpan.FULL || group.fields.length === 1) {
            return renderField(group.fields[0]);
          }
          const gridClass =
            group.span === FieldSpan.THIRD
              ? "grid grid-cols-1 sm:grid-cols-3 gap-3"
              : "grid grid-cols-2 gap-3";

          return (
            <div key={`group-${groupIdx}`} className={gridClass}>
              {group.fields.map((field) => renderField(field))}
            </div>
          );
        })}
        <DialogFooter className="bg-transparent border-t-0 p-0 pt-2 mx-0 mb-0 flex flex-row items-center justify-end gap-2">
          {isEdit && isUnchanged && (
            <span className="text-xs text-muted-foreground italic">No changes to save</span>
          )}
          <div className="flex items-center gap-2">
            <Button
              id={`${mode}-entity-cancel`}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="gap-1.5 h-8 px-3 text-xs"
              disabled={form.formState.isSubmitting}
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button
              id={`${mode}-entity-submit`}
              type="submit"
              size="sm"
              className="gap-1.5 h-8 px-3 text-xs shadow-sm"
              disabled={form.formState.isSubmitting || (isEdit && !!isUnchanged)}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {submitButtonText}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}
