import { describe, it, expect } from "vitest"
import { Role, ProjectSlug, EntityKey, PermissionKey } from "@/lib/constants/enums"
import { getPermissions, hasPermission, hasPageAccess, hasCreateAccess, hasDeleteAccess, isColumnVisible, isFieldVisible } from "./access"

describe("RBAC Access Controls", () => {
  describe("getPermissions", () => {
    it("should return default denied permissions when role is null or undefined", () => {
      const defaultDenied = { read: false, write: false, delete: false, create: false, show: false, filter: false }
      expect(getPermissions(null, ProjectSlug.WEIGHMENTS)).toEqual(defaultDenied)
      expect(getPermissions(undefined, ProjectSlug.WEIGHMENTS)).toEqual(defaultDenied)
    })

    it("should grant Admin access correct permissions", () => {
      const weighmentPerms = getPermissions(Role.ADMIN, ProjectSlug.WEIGHMENTS)
      expect(weighmentPerms).toMatchObject({
        read: true,
        write: true,
        delete: true,
        create: false,
        show: true,
        filter: true,
      })
    })

    it("should grant Manager correct permissions (can write/create but not delete rates, customers)", () => {
      const ratePerms = getPermissions(Role.MANAGER, ProjectSlug.RATES)
      expect(ratePerms).toMatchObject({
        read: true,
        write: true,
        delete: false,
        create: true,
        show: true,
        filter: true,
      })
    })

    it("should grant Operator correct permissions (read-only rates/centers, write customers)", () => {
      const weighmentPerms = getPermissions(Role.OPERATOR, ProjectSlug.WEIGHMENTS)
      expect(weighmentPerms).toMatchObject({
        read: true,
        write: true,
        delete: false,
        create: false,
        show: true,
        filter: true,
      })

      const ratePerms = getPermissions(Role.OPERATOR, ProjectSlug.RATES)
      expect(ratePerms).toMatchObject({
        read: true,
        write: false,
        delete: false,
        create: false,
        show: false,
        filter: true,
      })
    })

    it("should grant Base role view-only access to weighments page on dashboard", () => {
      const weighmentPerms = getPermissions(Role.BASE, ProjectSlug.WEIGHMENTS)
      expect(weighmentPerms).toMatchObject({
        read: true,
        write: false,
        delete: false,
        create: false,
        show: true,
        filter: true,
      })
    })


  })

  describe("hasPageAccess", () => {
    it("should use show permission for page access", () => {
      expect(hasPageAccess(Role.OPERATOR, ProjectSlug.WEIGHMENTS)).toBe(true)
      expect(hasPageAccess(Role.OPERATOR, ProjectSlug.RATES)).toBe(false)
      expect(hasPageAccess(Role.BASE, ProjectSlug.WEIGHMENTS)).toBe(true)
    })
  })

  describe("hasCreateAccess", () => {
    it("should return false for WEIGHMENTS, ENTRIES, COMMODITIES and true for CUSTOMERS", () => {
      expect(hasCreateAccess(Role.OPERATOR, ProjectSlug.WEIGHMENTS)).toBe(false);
      expect(hasCreateAccess(Role.OPERATOR, ProjectSlug.ENTRIES)).toBe(false);
      expect(hasCreateAccess(Role.OPERATOR, ProjectSlug.COMMODITIES)).toBe(false);
      expect(hasCreateAccess(Role.OPERATOR, ProjectSlug.CUSTOMERS)).toBe(true);
    })
  })

  describe("hasDeleteAccess", () => {
    it("should return delete permission", () => {
      expect(hasDeleteAccess(Role.ADMIN, ProjectSlug.WEIGHMENTS)).toBe(true)
      expect(hasDeleteAccess(Role.MANAGER, ProjectSlug.WEIGHMENTS)).toBe(false)
    })
  })

  describe("hasPermission", () => {
    it("allows only admins to edit weighment weight", () => {
      expect(hasPermission(Role.ADMIN, ProjectSlug.WEIGHMENTS, PermissionKey.EDIT_FIELD, EntityKey.WEIGHT)).toBe(true)
      expect(hasPermission(Role.MANAGER, ProjectSlug.WEIGHMENTS, PermissionKey.EDIT_FIELD, EntityKey.WEIGHT)).toBe(false)
      expect(hasPermission(Role.OPERATOR, ProjectSlug.WEIGHMENTS, PermissionKey.EDIT_FIELD, EntityKey.WEIGHT)).toBe(false)
      expect(hasPermission(Role.BASE, ProjectSlug.WEIGHMENTS, PermissionKey.EDIT_FIELD, EntityKey.WEIGHT)).toBe(false)
    })
  })

  describe("isColumnVisible & isFieldVisible", () => {
    it("should hide factory_id and factory_name columns and fields across all roles", () => {
      const roles = [Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.BASE];
      for (const role of roles) {
        expect(isColumnVisible(role, ProjectSlug.CENTERS, EntityKey.FACTORY_ID)).toBe(false)
        expect(isColumnVisible(role, ProjectSlug.CENTERS, EntityKey.FACTORY_NAME)).toBe(false)
        expect(isFieldVisible(role, ProjectSlug.CENTERS, EntityKey.FACTORY_ID)).toBe(false)

        expect(isColumnVisible(role, ProjectSlug.CENTERS, EntityKey.NAME)).toBe(true)
        expect(isFieldVisible(role, ProjectSlug.CENTERS, EntityKey.NAME)).toBe(true)
      }
    })
  })
})
