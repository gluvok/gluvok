/**
 * @file components/projects/dialog/entity-content.tsx
 * @description Renders entity form fields, headers, and view-details displays within EntityDialog.
 */

"use client";

import {
  Pencil,
  Plus,
  Save,
  X,
  Loader2,
  Ticket,
  Scale,
  Truck,
  CircleAlert,
  UserCog,
  MessageSquare,
} from "lucide-react";
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
  DialogMode,
} from "@/lib/constants/enums";
import { type FieldConfig, getSingularName } from "@/lib/fields";
import { useAuthStore, isFieldVisible, isFieldRequired, getField } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";
import { type Ticket as TicketEntity } from "@/types";

export function EntityDialogContent({
  mode,
  onOpenChange,
  projectName,
  projectSlug,
  isEdit,
  isUnchanged,
  fields,
  form,
  onSubmit,
  primaryIdKey,
  item,
}: EntityDialogContentProps) {
  const currentUser = useAuthStore((state) => state.user);

  // VIEW MODE FOR TICKETS
  if (mode === DialogMode.VIEW && projectSlug === ProjectSlug.TICKETS && item) {
    const ticket = item as unknown as TicketEntity;
    const itemId = String(getField(item, primaryIdKey));
    const authorName = ticket.users?.name || ticket.user_name || `User #${ticket.user_id}`;
    const authorUsername = ticket.users?.username || ticket.user_username;
    const entryPlate = ticket.entries?.vehicle_number;
    const entryWeight = ticket.entries?.weight;
    const weighmentPlate = ticket.weighments?.in_entry?.vehicle_number;
    const weighmentNet = ticket.weighments?.net_weight;
    const weighmentUnit = ticket.weighments?.unit;

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Ticket className="h-4 w-4" />
            </div>
            Ticket #{itemId}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-0.5 flex items-center gap-1.5">
            <UserCog className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
            <span>
              Raised by <strong className="text-foreground">{authorName}</strong>
              {authorUsername ? ` (@${authorUsername})` : ""} on{" "}
              {formatDateTime(String(ticket.created_at))}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-4 text-xs">
          {/* Linked Target Card */}
          <div className="p-3 rounded-lg border border-border/70 bg-muted/30 space-y-1">
            <div className="font-semibold text-2xs uppercase tracking-wider text-muted-foreground">
              Linked Target
            </div>
            <div className="flex items-center gap-2">
              {ticket.entry_id ? (
                <>
                  <Truck className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">Entry #{ticket.entry_id}</span>
                    {entryPlate ? (
                      <span className="text-muted-foreground font-mono ml-1.5">
                        (Plate: {entryPlate} · {entryWeight} kg)
                      </span>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <Scale className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">
                      Weighment #{ticket.weighment_id}
                    </span>
                    {weighmentPlate ? (
                      <span className="text-muted-foreground font-mono ml-1.5">
                        (Plate: {weighmentPlate} · Net: {weighmentNet} {weighmentUnit})
                      </span>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Concern Section with CircleAlert icon */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-2xs uppercase tracking-wider text-muted-foreground">
              <CircleAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Concern
            </div>
            <div className="p-3 rounded-lg border border-border/70 bg-background text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {String(ticket.concern || "")}
            </div>
          </div>

          {/* Support Response Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-2xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3 text-primary" /> Support Response
              </span>
              <span className="text-2xs font-medium">
                Status:{" "}
                <span className="capitalize font-semibold text-foreground">
                  {String(ticket.status || "pending")}
                </span>
              </span>
            </div>
            <div className="p-3 rounded-lg border border-border/70 bg-muted/40 text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {ticket.reply && ticket.reply.trim() ? (
                ticket.reply
              ) : (
                <span className="text-muted-foreground/60 italic">
                  This ticket is currently pending review by the system administrator.
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 pt-2 flex flex-row items-center justify-end">
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }

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
