import { describe, it, expect } from "vitest";
import { Role, ProjectSlug, PermissionKey } from "@/lib/constants/enums";
import {
  getPermissions,
  hasPermission,
  hasPageAccess,
  hasCreateAccess,
  hasDeleteAccess,
  isColumnVisible,
  isFieldVisible,
} from "./access";

describe("RBAC Access Controls", () => {
  describe("getPermissions", () => {
    it("should return default denied permissions when role is null or undefined", () => {
      const defaultDenied = {
        read: false,
        write: false,
        delete: false,
        create: false,
        show: false,
        filter: false,
      };
      expect(getPermissions(null, ProjectSlug.WEIGHMENTS)).toEqual(defaultDenied);
      expect(getPermissions(undefined, ProjectSlug.WEIGHMENTS)).toEqual(defaultDenied);
    });

    it("should grant Admin access correct permissions", () => {
      const weighmentPerms = getPermissions(Role.ADMIN, ProjectSlug.WEIGHMENTS);
      expect(weighmentPerms).toMatchObject({
        read: true,
        write: true,
        delete: true,
        create: false,
        show: true,
        filter: true,
      });
    });

    it("should grant Manager correct permissions (can write/create/delete users and centers)", () => {
      const userPerms = getPermissions(Role.MANAGER, ProjectSlug.USERS);
      expect(userPerms).toMatchObject({
        read: true,
        write: true,
        delete: true,
        create: true,
        show: true,
        filter: true,
      });

      const centerPerms = getPermissions(Role.MANAGER, ProjectSlug.CENTERS);
      expect(centerPerms).toMatchObject({
        read: true,
        write: true,
        delete: true,
        create: true,
        show: true,
        filter: true,
      });
    });

    it("should grant Operator correct permissions (CRUD centers, write customers, read-only rates)", () => {
      const centerPerms = getPermissions(Role.OPERATOR, ProjectSlug.CENTERS);
      expect(centerPerms).toMatchObject({
        read: true,
        write: true,
        delete: true,
        create: true,
        show: true,
        filter: true,
      });

      const customerPerms = getPermissions(Role.OPERATOR, ProjectSlug.CUSTOMERS);
      expect(customerPerms).toMatchObject({
        read: true,
        write: true,
        delete: false,
        create: true,
        show: true,
        filter: true,
      });

      const weighmentPerms = getPermissions(Role.OPERATOR, ProjectSlug.WEIGHMENTS);
      expect(weighmentPerms).toMatchObject({
        read: true,
        write: true,
        delete: false,
        create: false,
        show: true,
        filter: true,
      });

      const ratePerms = getPermissions(Role.OPERATOR, ProjectSlug.RATES);
      expect(ratePerms).toMatchObject({
        read: true,
        write: false,
        delete: false,
        create: false,
        show: false,
        filter: true,
      });
    });

    it("should grant Base role view-only access to weighments page on dashboard", () => {
      const weighmentPerms = getPermissions(Role.BASE, ProjectSlug.WEIGHMENTS);
      expect(weighmentPerms).toMatchObject({
        read: true,
        write: false,
        delete: false,
        create: false,
        show: true,
        filter: true,
      });
    });

    it("should grant Hardware role create and write permission for entries and read for centers", () => {
      const entryPerms = getPermissions(Role.HARDWARE, ProjectSlug.ENTRIES);
      expect(entryPerms).toMatchObject({
        read: true,
        write: true,
        create: true,
        delete: false,
        show: false,
      });

      const centerPerms = getPermissions(Role.HARDWARE, ProjectSlug.CENTERS);
      expect(centerPerms).toMatchObject({
        read: true,
        create: false,
        show: false,
      });
    });
  });

  describe("hasPageAccess", () => {
    it("should use show permission for page access", () => {
      expect(hasPageAccess(Role.OPERATOR, ProjectSlug.WEIGHMENTS)).toBe(true);
      expect(hasPageAccess(Role.OPERATOR, ProjectSlug.CENTERS)).toBe(true);
      expect(hasPageAccess(Role.OPERATOR, ProjectSlug.RATES)).toBe(false);
      expect(hasPageAccess(Role.BASE, ProjectSlug.WEIGHMENTS)).toBe(true);
      expect(hasPageAccess(Role.HARDWARE, ProjectSlug.ENTRIES)).toBe(false);
    });
  });

  describe("hasCreateAccess", () => {
    it("should return false for WEIGHMENTS, COMMODITIES and true for CENTERS, USERS, CUSTOMERS, ENTRIES", () => {
      expect(hasCreateAccess(Role.OPERATOR, ProjectSlug.WEIGHMENTS)).toBe(false);
      expect(hasCreateAccess(Role.OPERATOR, ProjectSlug.CENTERS)).toBe(true);
      expect(hasCreateAccess(Role.OPERATOR, ProjectSlug.ENTRIES)).toBe(true);
      expect(hasCreateAccess(Role.ADMIN, ProjectSlug.ENTRIES)).toBe(true);
      expect(hasCreateAccess(Role.MANAGER, ProjectSlug.USERS)).toBe(true);
      expect(hasCreateAccess(Role.OPERATOR, ProjectSlug.COMMODITIES)).toBe(false);
      expect(hasCreateAccess(Role.OPERATOR, ProjectSlug.CUSTOMERS)).toBe(true);
      expect(hasCreateAccess(Role.HARDWARE, ProjectSlug.ENTRIES)).toBe(true);
    });
  });

  describe("hasDeleteAccess", () => {
    it("should allow only ADMIN to delete WEIGHMENTS", () => {
      expect(hasDeleteAccess(Role.ADMIN, ProjectSlug.WEIGHMENTS)).toBe(true);
      expect(hasDeleteAccess(Role.MANAGER, ProjectSlug.WEIGHMENTS)).toBe(false);
      expect(hasDeleteAccess(Role.OPERATOR, ProjectSlug.WEIGHMENTS)).toBe(false);
      expect(hasDeleteAccess(Role.BASE, ProjectSlug.WEIGHMENTS)).toBe(false);
      expect(hasDeleteAccess(Role.HARDWARE, ProjectSlug.WEIGHMENTS)).toBe(false);
    });

    it("should allow only ADMIN to delete ENTRIES", () => {
      expect(hasDeleteAccess(Role.ADMIN, ProjectSlug.ENTRIES)).toBe(true);
      expect(hasDeleteAccess(Role.MANAGER, ProjectSlug.ENTRIES)).toBe(false);
      expect(hasDeleteAccess(Role.OPERATOR, ProjectSlug.ENTRIES)).toBe(false);
      expect(hasDeleteAccess(Role.BASE, ProjectSlug.ENTRIES)).toBe(false);
      expect(hasDeleteAccess(Role.HARDWARE, ProjectSlug.ENTRIES)).toBe(false);
    });
  });

  describe("hasPermission", () => {
    it("allows only admins to edit weighment weight", () => {
      expect(
        hasPermission(Role.ADMIN, ProjectSlug.WEIGHMENTS, PermissionKey.EDIT_FIELD, "weight"),
      ).toBe(true);
      expect(
        hasPermission(Role.MANAGER, ProjectSlug.WEIGHMENTS, PermissionKey.EDIT_FIELD, "weight"),
      ).toBe(false);
      expect(
        hasPermission(Role.OPERATOR, ProjectSlug.WEIGHMENTS, PermissionKey.EDIT_FIELD, "weight"),
      ).toBe(false);
      expect(
        hasPermission(Role.BASE, ProjectSlug.WEIGHMENTS, PermissionKey.EDIT_FIELD, "weight"),
      ).toBe(false);
    });

    it("allows only admins to edit factory name in settings", () => {
      expect(
        hasPermission(Role.ADMIN, ProjectSlug.SETTINGS, PermissionKey.EDIT_FIELD, "name"),
      ).toBe(true);
      expect(
        hasPermission(Role.MANAGER, ProjectSlug.SETTINGS, PermissionKey.EDIT_FIELD, "name"),
      ).toBe(false);
      expect(
        hasPermission(Role.OPERATOR, ProjectSlug.SETTINGS, PermissionKey.EDIT_FIELD, "name"),
      ).toBe(false);

      // Both Admin and Manager can toggle check_center_on_merge
      expect(
        hasPermission(
          Role.ADMIN,
          ProjectSlug.SETTINGS,
          PermissionKey.EDIT_FIELD,
          "check_center_on_merge",
        ),
      ).toBe(true);
      expect(
        hasPermission(
          Role.MANAGER,
          ProjectSlug.SETTINGS,
          PermissionKey.EDIT_FIELD,
          "check_center_on_merge",
        ),
      ).toBe(true);
    });
  });

  describe("Settings Access", () => {
    it("disallows create and delete for all roles", () => {
      const roles = [Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.BASE, Role.HARDWARE];
      for (const role of roles) {
        expect(hasCreateAccess(role, ProjectSlug.SETTINGS)).toBe(false);
        expect(hasDeleteAccess(role, ProjectSlug.SETTINGS)).toBe(false);
      }
    });

    it("shows settings page to Admin and Manager but hides from others", () => {
      expect(hasPageAccess(Role.ADMIN, ProjectSlug.SETTINGS)).toBe(true);
      expect(hasPageAccess(Role.MANAGER, ProjectSlug.SETTINGS)).toBe(true);
      expect(hasPageAccess(Role.OPERATOR, ProjectSlug.SETTINGS)).toBe(false);
      expect(hasPageAccess(Role.BASE, ProjectSlug.SETTINGS)).toBe(false);
      expect(hasPageAccess(Role.HARDWARE, ProjectSlug.SETTINGS)).toBe(false);
    });
  });

  describe("isColumnVisible & isFieldVisible", () => {
    it("should hide factory_id and factory_name columns and fields across all roles", () => {
      const roles = [Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.BASE, Role.HARDWARE];
      for (const role of roles) {
        expect(isColumnVisible(role, ProjectSlug.CENTERS, "factory_id")).toBe(false);
        expect(isColumnVisible(role, ProjectSlug.CENTERS, "factory_name")).toBe(false);
        expect(isFieldVisible(role, ProjectSlug.CENTERS, "factory_id")).toBe(false);

        expect(isColumnVisible(role, ProjectSlug.CENTERS, "name")).toBe(true);
        expect(isFieldVisible(role, ProjectSlug.CENTERS, "name")).toBe(true);
      }
    });
  });
});
