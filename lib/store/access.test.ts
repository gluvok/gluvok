import { describe, it, expect } from "vitest"
import { Role, ProjectSlug, EntityKey, TenantMode } from "@/lib/constants/enums"
import { getPermissions, hasPageAccess, hasCreateAccess, hasDeleteAccess, isColumnVisible, isFieldVisible } from "./access"

describe("RBAC Access Controls", () => {
  describe("getPermissions", () => {
    it("should return default denied permissions when role is null or undefined", () => {
      const defaultDenied = { read: false, write: false, delete: false, create: false, show: false, filter: false }
      expect(getPermissions(null, ProjectSlug.WEIGHMENTS)).toEqual(defaultDenied)
      expect(getPermissions(undefined, ProjectSlug.WEIGHMENTS)).toEqual(defaultDenied)
    })

    it("should grant Super Admin full access to all resources", () => {
      const allSlugs = Object.values(ProjectSlug)
      for (const slug of allSlugs) {
        const perms = getPermissions(Role.SUPER_ADMIN, slug)
        expect(perms).toEqual({
          read: true,
          write: true,
          delete: true,
          create: true,
          show: true,
          filter: true,
        })
      }
    })

    it("should grant Admin access correct permissions (can edit/delete but not create factories)", () => {
      const factoryPerms = getPermissions(Role.ADMIN, ProjectSlug.FACTORIES)
      expect(factoryPerms).toEqual({
        read: true,
        write: true,
        delete: true,
        create: false,
        show: false,
        filter: false,
      })

      const weighmentPerms = getPermissions(Role.ADMIN, ProjectSlug.WEIGHMENTS)
      expect(weighmentPerms).toMatchObject({
        read: true,
        write: true,
        delete: true,
        create: true,
        show: true,
        filter: true,
      })
    })

    it("should grant Manager correct permissions (can write/create but not delete rates, customers, weighments)", () => {
      const ratePerms = getPermissions(Role.MANAGER, ProjectSlug.RATES)
      expect(ratePerms).toMatchObject({
        read: true,
        write: true,
        delete: false,
        create: true,
        show: true,
        filter: true,
      })

      // Cannot see factories, centers, commodities on dashboard
      expect(getPermissions(Role.MANAGER, ProjectSlug.FACTORIES).show).toBe(false)
      expect(getPermissions(Role.MANAGER, ProjectSlug.CENTERS).show).toBe(false)
      expect(getPermissions(Role.MANAGER, ProjectSlug.COMMODITIES).show).toBe(false)
    })

    it("should grant Operator write/create access only to customers and weighments", () => {
      const customerPerms = getPermissions(Role.OPERATOR, ProjectSlug.CUSTOMERS)
      expect(customerPerms).toMatchObject({
        read: true,
        write: true,
        delete: false,
        create: true,
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

    it("should grant Hardware role write/create/show access to weighments only", () => {
      const weighmentPerms = getPermissions(Role.HARDWARE, ProjectSlug.WEIGHMENTS)
      expect(weighmentPerms).toMatchObject({
        read: true,
        write: false,
        delete: false,
        create: true,
        show: true,
        filter: true,
      })

      const customerPerms = getPermissions(Role.HARDWARE, ProjectSlug.CUSTOMERS)
      expect(customerPerms.show).toBe(false)
    })

    it("should grant Base role read only access to all but show: false to all except weighments", () => {
      const allSlugs = Object.values(ProjectSlug).filter((slug) => slug !== ProjectSlug.CONFIGS)
      for (const slug of allSlugs) {
        const perms = getPermissions(Role.BASE, slug)
        expect(perms).toMatchObject({
          read: true,
          write: false,
          delete: false,
          create: false,
          show: slug === ProjectSlug.WEIGHMENTS,
          filter: slug !== ProjectSlug.CENTERS && slug !== ProjectSlug.FACTORIES,
        })
      }
      expect(getPermissions(Role.BASE, ProjectSlug.CONFIGS).read).toBe(false)
    })

    it("should hide factory fields, columns, and filters and hide factories page in TenantMode.DEDICATED", () => {
      const dedicatedAdmin = getPermissions(Role.ADMIN, ProjectSlug.CENTERS, TenantMode.DEDICATED)
      expect(dedicatedAdmin.hiddenColumns).toContain(EntityKey.FACTORY_ID)
      expect(dedicatedAdmin.hiddenColumns).toContain(EntityKey.FACTORY_NAME)
      expect(dedicatedAdmin.hiddenFields).toContain(EntityKey.FACTORY_ID)
      expect(dedicatedAdmin.hiddenFilters).toContain(EntityKey.FACTORY_ID)

      expect(isColumnVisible(Role.ADMIN, ProjectSlug.CENTERS, EntityKey.FACTORY_ID, TenantMode.DEDICATED)).toBe(false)
      expect(isColumnVisible(Role.SUPER_ADMIN, ProjectSlug.CENTERS, EntityKey.FACTORY_NAME, TenantMode.DEDICATED)).toBe(false)
      expect(isFieldVisible(Role.ADMIN, ProjectSlug.CENTERS, EntityKey.FACTORY_ID, TenantMode.DEDICATED)).toBe(false)

      const dedicatedFactories = getPermissions(Role.SUPER_ADMIN, ProjectSlug.FACTORIES, TenantMode.DEDICATED)
      expect(dedicatedFactories.show).toBe(false)
      expect(dedicatedFactories.read).toBe(false)
    })
  })

  describe("hasPageAccess", () => {
    it("should use show permission for page access", () => {
      // Operator should see weighments but not rates
      expect(hasPageAccess(Role.OPERATOR, ProjectSlug.WEIGHMENTS)).toBe(true)
      expect(hasPageAccess(Role.OPERATOR, ProjectSlug.RATES)).toBe(false)

      // Base should see weighments page on dashboard
      expect(hasPageAccess(Role.BASE, ProjectSlug.WEIGHMENTS)).toBe(true)
    })
  })

  describe("hasCreateAccess", () => {
    it("should return create permission", () => {
      expect(hasCreateAccess(Role.HARDWARE, ProjectSlug.WEIGHMENTS)).toBe(true)
      expect(hasCreateAccess(Role.HARDWARE, ProjectSlug.CUSTOMERS)).toBe(false)
    })
  })

  describe("hasDeleteAccess", () => {
    it("should return delete permission", () => {
      expect(hasDeleteAccess(Role.ADMIN, ProjectSlug.WEIGHMENTS)).toBe(true)
      expect(hasDeleteAccess(Role.MANAGER, ProjectSlug.WEIGHMENTS)).toBe(false)
    })
  })

  describe("isColumnVisible & isFieldVisible", () => {
    it("should allow Super Admin to view factory_id and factory_name columns and fields", () => {
      expect(isColumnVisible(Role.SUPER_ADMIN, ProjectSlug.CENTERS, EntityKey.FACTORY_ID)).toBe(true)
      expect(isColumnVisible(Role.SUPER_ADMIN, ProjectSlug.CENTERS, EntityKey.FACTORY_NAME)).toBe(true)
      expect(isFieldVisible(Role.SUPER_ADMIN, ProjectSlug.CENTERS, EntityKey.FACTORY_ID)).toBe(true)
    })

    it("should hide factory_id and factory_name columns and fields for non-Super Admin roles", () => {
      const nonSuperAdminRoles = [Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.BASE, Role.HARDWARE]
      for (const role of nonSuperAdminRoles) {
        expect(isColumnVisible(role, ProjectSlug.CENTERS, EntityKey.FACTORY_ID)).toBe(false)
        expect(isColumnVisible(role, ProjectSlug.CENTERS, EntityKey.FACTORY_NAME)).toBe(false)
        expect(isFieldVisible(role, ProjectSlug.CENTERS, EntityKey.FACTORY_ID)).toBe(false)

        // Non-factory columns and fields should still be visible
        expect(isColumnVisible(role, ProjectSlug.CENTERS, EntityKey.NAME)).toBe(true)
        expect(isFieldVisible(role, ProjectSlug.CENTERS, EntityKey.NAME)).toBe(true)
      }
    })
  })
})
