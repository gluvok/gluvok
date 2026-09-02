/**
 * @file lib/constants/enums.ts
 * @description Core system enums for domain models, database types, layout, and permissions.
 */

export enum Role {
  ADMIN = "admin",
  MANAGER = "manager",
  OPERATOR = "operator",
  BASE = "base",
  HARDWARE = "hardware",
}

export enum Unit {
  KG = "kg",
  Q = "q",
  GAL = "gal",
}

export enum EntryStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum EntrySource {
  DEVICE = "device",
  MANUAL = "manual",
}

export enum WeighmentType {
  UNASSIGNED = "unassigned",
  IN = "in",
  OUT = "out",
}

export enum ProjectSlug {
  CENTERS = "centers",
  COMMODITIES = "commodities",
  RATES = "rates",
  CUSTOMERS = "customers",
  ENTRIES = "entries",
  WEIGHMENTS = "weighments",
  USERS = "users",
  SETTINGS = "settings",
}

export enum PermissionKey {
  READ = "read",
  WRITE = "write",
  EDIT_FIELD = "edit_field",
  DELETE = "delete",
  CREATE = "create",
  SHOW = "show",
  FILTER = "filter",
}

export enum FieldType {
  TEXT = "text",
  NUMBER = "number",
  PASSWORD = "password",
  IMAGES = "images",
  ROLE = "role",
  UNIT = "unit",
  TYPE = "type",
  CHECKBOX = "checkbox",
  SWITCH = "switch",
  ENTRY_STATUS = "entry_status",
}

export enum FieldSpan {
  FULL = "full",
  HALF = "half",
  THIRD = "third",
}

export enum DialogMode {
  CREATE = "create",
  EDIT = "edit",
}

export enum DatePreset {
  TODAY = "today",
  YESTERDAY = "yesterday",
  LAST_2_DAYS = "2days",
  LAST_7_DAYS = "7days",
  THIS_MONTH = "thisMonth",
}
