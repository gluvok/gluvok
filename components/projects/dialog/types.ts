/**
 * @file components/projects/dialog/types.ts
 * @description Dialog component or hook for managing types actions.
 */

import { type FieldValues, type UseFormReturn } from "react-hook-form";
import { type FieldConfig } from "@/lib/fields";
import { DialogMode } from "@/lib/constants/enums";
import { type EntityRecord } from "@/types";

export interface EntityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectSlug: string;
  projectName: string;
  primaryIdKey: string;
}

export interface EntityDialogContentProps {
  mode: DialogMode;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  projectSlug: string;
  isEdit: boolean;
  isUnchanged?: boolean;
  fields: FieldConfig[];
  form: UseFormReturn<FieldValues>;
  onSubmit: (values: FieldValues) => void;
  primaryIdKey: string;
  item?: EntityRecord | null;
}

export interface BaseDeleteDialogProps {
  onOpenChange: (open: boolean) => void;
  projectSlug?: string;
  projectName?: string;
  primaryIdKey?: string;
  item?: EntityRecord | null;
  items?: EntityRecord[];
  onSuccess?: () => void;
  customDisplayName?: string;
  onConfirm?: () => void;
}

export type DeleteContentProps = BaseDeleteDialogProps;

export interface DeleteEntityDialogProps extends BaseDeleteDialogProps {
  open: boolean;
  size?: "default" | "sm";
}
