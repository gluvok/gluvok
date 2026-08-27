/**
 * @file components/projects/dialog/entity-content.tsx
 * @description Dialog component or hook for managing entity content actions.
 */

"use client";

import { Pencil, Plus, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormFieldInput } from "@/components/form";
import { type EntityDialogContentProps } from "./types";
import { FieldType, Role, FieldSpan, EntityKey, PermissionKey } from "@/lib/constants/enums";
import { type FieldConfig, getSingularName } from "@/lib/fields";
import { useAuthStore, hasPermission, isFieldVisible, isFieldRequired } from "@/lib/store";

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
}: EntityDialogContentProps) {
  const currentUser = useAuthStore((state) => state.user);
  const Icon = isEdit ? Pencil : Plus;
  const singularName = getSingularName(projectName);
  const desc = isEdit
    ? "Update the attributes of this record. Click save when done."
    : `Enter the details for the new ${singularName.toLowerCase()}. Click save when done.`;

  const originalText = isEdit ? "Save" : "Save";

  const renderField = (field: FieldConfig) => {
    const disabled =
      (isEdit && field.key === primaryIdKey) ||
      (field.editableRoles && !field.editableRoles.includes(currentUser?.role as Role)) ||
      (isEdit &&
        field.requiresEditPermission &&
        !hasPermission(currentUser?.role, projectSlug, PermissionKey.EDIT_FIELD, field.key));

    switch (field.type) {
      case FieldType.CHECKBOX:
        return (
          <div key={field.key} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 h-9 px-1">
              <FormFieldInput
                field={field}
                form={form}
                idPrefix={`${mode}-entity`}
                disabled={disabled}
                projectSlug={projectSlug}
              />
              <label
                htmlFor={`${mode}-entity-field-${field.key}`}
                className="text-xs font-semibold text-muted-foreground cursor-pointer select-none flex items-center gap-1.5"
              >
                {field.icon && <field.icon className="h-3.5 w-3.5 text-muted-foreground/75" />}
                {field.label}
              </label>
              {form.formState.errors[field.key] && (
                <span className="text-destructive text-xs font-medium ml-2">
                  {form.formState.errors[field.key]?.message as string}
                </span>
              )}
            </div>
          </div>
        );
      default: {
        const isPasswordInEdit =
          isEdit && (field.key === EntityKey.PASSWORD || field.key === EntityKey.CONFIRM_PASSWORD);
        const displayLabel = isPasswordInEdit
          ? field.key === EntityKey.PASSWORD
            ? "New Password"
            : "Confirm New Password"
          : field.label;
        const displayPlaceholder = isPasswordInEdit
          ? "Leave blank to keep unchanged"
          : field.placeholder;
        const isReq = isFieldRequired(projectSlug, field.key, field.required);
        const showAsterisk = isReq && !isPasswordInEdit;

        const effectiveField = {
          ...field,
          label: displayLabel,
          placeholder: displayPlaceholder,
        };

        return (
          <div key={field.key} className="flex flex-col gap-1.5 min-w-0 flex-1">
            <label
              htmlFor={`field-${field.key}`}
              className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"
            >
              {field.icon && <field.icon className="h-3.5 w-3.5 text-muted-foreground/75" />}
              {displayLabel}
              {showAsterisk && (
                <span className="text-destructive leading-none" aria-hidden>
                  *
                </span>
              )}
            </label>
            <FormFieldInput
              field={effectiveField}
              form={form}
              idPrefix={`${mode}-entity`}
              disabled={disabled}
              projectSlug={projectSlug}
            />
            {form.formState.errors[field.key] && (
              <span className="text-destructive text-[11px] font-medium">
                {form.formState.errors[field.key]?.message as string}
              </span>
            )}
          </div>
        );
      }
    }
  };

  const visibleFields = fields.filter((field) => {
    const role = currentUser?.role as Role;
    if (!isFieldVisible(role, projectSlug, field.key)) {
      return false;
    }
    if (field.visibleRoles && !field.visibleRoles.includes(role)) {
      return false;
    }
    if (isEdit && field.editVisibleRoles && !field.editVisibleRoles.includes(role)) {
      return false;
    }
    // Hide createOnly fields (e.g. password, confirmPassword) when editing
    if (isEdit && field.createOnly) {
      return false;
    }
    return true;
  });

  type GroupItem = { span: FieldSpan; fields: FieldConfig[] };
  const fieldGroups: GroupItem[] = [];
  let currentGroupSpan: FieldSpan | null = null;
  let currentGroup: FieldConfig[] = [];

  const flushGroup = () => {
    if (currentGroup.length > 0 && currentGroupSpan) {
      fieldGroups.push({ span: currentGroupSpan, fields: [...currentGroup] });
      currentGroup = [];
      currentGroupSpan = null;
    }
  };

  visibleFields.forEach((field) => {
    const fieldSpan: FieldSpan = field.span || (field.halfWidth ? FieldSpan.HALF : FieldSpan.FULL);
    const maxInGroup = fieldSpan === FieldSpan.THIRD ? 3 : fieldSpan === FieldSpan.HALF ? 2 : 1;

    if (fieldSpan === FieldSpan.FULL) {
      flushGroup();
      fieldGroups.push({ span: FieldSpan.FULL, fields: [field] });
    } else {
      if (field.newRow || currentGroupSpan !== fieldSpan || currentGroup.length >= maxInGroup) {
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
          <Icon className="h-4 w-4 text-primary" /> {isEdit ? "Edit" : "Add"}
        </DialogTitle>
        <DialogDescription>{desc}</DialogDescription>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
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
              {originalText}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}
