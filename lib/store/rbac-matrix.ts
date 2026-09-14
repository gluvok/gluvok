/**
 * @file lib/store/rbac-matrix.ts
 * @description Role-based access control (RBAC) permission matrix definition for all system roles and entities.
 */

import { Role, ProjectSlug } from "@/lib/constants/enums";

export interface Permission {
  read: boolean;
  write: boolean;
  delete: boolean;
  create: boolean;
  show: boolean;
  filter: boolean;
  hiddenColumns?: string[];
  hiddenFields?: string[];
  editableFields?: string[];
}

export type RoleAccessMatrix = {
  [K in ProjectSlug]: Permission;
};

export type RbacMatrix = {
  [key in Role]: RoleAccessMatrix;
};

export const RBAC_MATRIX: RbacMatrix = {
  [Role.ADMIN]: {
    [ProjectSlug.USERS]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.CENTERS]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.COMMODITIES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: true,
      filter: true,
    },
    [ProjectSlug.RATES]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.CUSTOMERS]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.ENTRIES]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.WEIGHMENTS]: {
      read: true,
      write: true,
      delete: true,
      create: false,
      show: true,
      filter: true,
      editableFields: ["weight"],
    },
    [ProjectSlug.SETTINGS]: {
      read: true,
      write: true,
      delete: false,
      create: false,
      show: true,
      filter: false,
      editableFields: ["name", "check_center_on_merge"],
    },
    [ProjectSlug.TICKETS]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
  },
  [Role.MANAGER]: {
    [ProjectSlug.USERS]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.CENTERS]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.COMMODITIES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: true,
      filter: true,
    },
    [ProjectSlug.RATES]: {
      read: true,
      write: true,
      delete: false,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.CUSTOMERS]: {
      read: true,
      write: true,
      delete: false,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.ENTRIES]: {
      read: true,
      write: true,
      delete: false,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.WEIGHMENTS]: {
      read: true,
      write: true,
      delete: false,
      create: false,
      show: true,
      filter: true,
    },
    [ProjectSlug.SETTINGS]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: true,
      filter: false,
      editableFields: [],
    },
    [ProjectSlug.TICKETS]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
  },
  [Role.OPERATOR]: {
    [ProjectSlug.USERS]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.CENTERS]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.COMMODITIES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: true,
      filter: true,
    },
    [ProjectSlug.RATES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.CUSTOMERS]: {
      read: true,
      write: true,
      delete: false,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.ENTRIES]: {
      read: true,
      write: true,
      delete: false,
      create: true,
      show: true,
      filter: true,
    },
    [ProjectSlug.WEIGHMENTS]: {
      read: true,
      write: true,
      delete: false,
      create: false,
      show: true,
      filter: true,
    },
    [ProjectSlug.SETTINGS]: {
      read: false,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    },
    [ProjectSlug.TICKETS]: {
      read: true,
      write: true,
      delete: true,
      create: true,
      show: true,
      filter: true,
    },
  },
  [Role.BASE]: {
    [ProjectSlug.USERS]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.CENTERS]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    },
    [ProjectSlug.COMMODITIES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.RATES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.CUSTOMERS]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: true,
    },
    [ProjectSlug.ENTRIES]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: true,
      filter: true,
    },
    [ProjectSlug.WEIGHMENTS]: {
      read: true,
      write: false,
      delete: false,
      create: false,
      show: true,
      filter: true,
    },
    [ProjectSlug.SETTINGS]: {
      read: false,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    },
    [ProjectSlug.TICKETS]: {
      read: false,
      write: false,
      delete: false,
      create: false,
      show: false,
      filter: false,
    },
  },
};
