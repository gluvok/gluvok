import { describe, it, expect } from "vitest";
import {
  getCommodityIcon,
  getStatusIcon,
  getSourceIcon,
  getTypeIcon,
  getAutoApproveIcon,
  getRoleIcon,
  getUnitIcon,
  getItemIcon,
  getItemColorClass,
} from "./helpers";
import {
  Flower2,
  Cloud,
  Bean,
  CandyCane,
  Sun,
  Wheat,
  Sprout,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Sliders,
  Cpu,
  User,
  ShieldCheck,
  Package,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  HelpCircle,
  Crown,
  UserCircle,
  Briefcase,
  HardHat,
  Bot,
  Shield,
  Ruler,
  Anvil,
  Boxes,
  Droplet,
} from "lucide-react";
import {
  EntrySource,
  EntryStatus,
  FieldType,
  ProjectSlug,
  WeighmentType,
  Role,
  Unit,
} from "@/lib/constants/enums";

describe("Field Helpers & Icon Mapping", () => {
  describe("getCommodityIcon", () => {
    it("returns appropriate icon for newly added agricultural commodities", () => {
      expect(getCommodityIcon("Mustard")).toBe(Flower2);
      expect(getCommodityIcon("mustard seeds")).toBe(Flower2);
      expect(getCommodityIcon("Cotton")).toBe(Cloud);
      expect(getCommodityIcon("cotton")).toBe(Cloud);
      expect(getCommodityIcon("Soybeans")).toBe(Bean);
      expect(getCommodityIcon("soyabeans")).toBe(Bean);
      expect(getCommodityIcon("Sugarcane")).toBe(CandyCane);
      expect(getCommodityIcon("sugar cane")).toBe(CandyCane);
      expect(getCommodityIcon("Sunflower Seeds")).toBe(Sun);
      expect(getCommodityIcon("sunflower")).toBe(Sun);
    });

    it("returns correct icons for existing commodities", () => {
      expect(getCommodityIcon("Wheat")).toBe(Wheat);
      expect(getCommodityIcon("Corn")).toBe(Sprout);
    });

    it("returns Package icon for unknown commodity", () => {
      expect(getCommodityIcon("Unknown Material")).toBe(Package);
      expect(getCommodityIcon("")).toBe(Package);
    });
  });

  describe("getStatusIcon", () => {
    it("returns Activity for all or undefined status (distinct from source Sliders)", () => {
      expect(getStatusIcon()).toBe(Activity);
      expect(getStatusIcon("all")).toBe(Activity);
    });

    it("returns specific icons for status values", () => {
      expect(getStatusIcon(EntryStatus.PENDING)).toBe(Clock);
      expect(getStatusIcon(EntryStatus.APPROVED)).toBe(CheckCircle2);
      expect(getStatusIcon(EntryStatus.REJECTED)).toBe(XCircle);
    });
  });

  describe("getSourceIcon", () => {
    it("returns Sliders for all or undefined source (distinct from status Activity)", () => {
      expect(getSourceIcon()).toBe(Sliders);
      expect(getSourceIcon("all")).toBe(Sliders);
    });

    it("returns specific icons for source values", () => {
      expect(getSourceIcon(EntrySource.DEVICE)).toBe(Cpu);
      expect(getSourceIcon(EntrySource.MANUAL)).toBe(User);
    });
  });

  describe("getAutoApproveIcon", () => {
    it("returns ShieldCheck for all or undefined verification", () => {
      expect(getAutoApproveIcon()).toBe(ShieldCheck);
      expect(getAutoApproveIcon("all")).toBe(ShieldCheck);
    });

    it("returns correct icons for verification states", () => {
      expect(getAutoApproveIcon("true")).toBe(CheckCircle2);
      expect(getAutoApproveIcon("system approved")).toBe(CheckCircle2);
      expect(getAutoApproveIcon("false")).toBe(XCircle);
      expect(getAutoApproveIcon("user review")).toBe(XCircle);
    });
  });

  describe("getTypeIcon", () => {
    it("returns ArrowLeftRight for all or undefined type (distinct from toolbar ListFilter)", () => {
      expect(getTypeIcon()).toBe(ArrowLeftRight);
      expect(getTypeIcon("all")).toBe(ArrowLeftRight);
    });

    it("returns specific directional icons for weighment types", () => {
      expect(getTypeIcon(WeighmentType.IN)).toBe(ArrowDownLeft);
      expect(getTypeIcon(WeighmentType.OUT)).toBe(ArrowUpRight);
      expect(getTypeIcon(WeighmentType.UNASSIGNED)).toBe(HelpCircle);
    });
  });

  describe("getRoleIcon", () => {
    it("returns distinct icons for roles without colliding with verification", () => {
      expect(getRoleIcon(Role.ADMIN)).toBe(Crown);
      expect(getRoleIcon(Role.BASE)).toBe(UserCircle);
      expect(getRoleIcon(Role.MANAGER)).toBe(Briefcase);
      expect(getRoleIcon(Role.OPERATOR)).toBe(HardHat);
      expect(getRoleIcon(Role.HARDWARE)).toBe(Bot);
      expect(getRoleIcon()).toBe(Shield);
    });
  });

  describe("getUnitIcon", () => {
    it("returns distinct measurement icons for each unit", () => {
      expect(getUnitIcon()).toBe(Ruler);
      expect(getUnitIcon(Unit.KG)).toBe(Anvil);
      expect(getUnitIcon(Unit.Q)).toBe(Boxes);
      expect(getUnitIcon(Unit.GAL)).toBe(Droplet);
    });
  });

  describe("getItemIcon", () => {
    it("resolves commodity, source, status, type, and verification icons correctly", () => {
      expect(getItemIcon(ProjectSlug.COMMODITIES, "Mustard")).toBe(Flower2);
      expect(getItemIcon("source", "All Sources")).toBe(Sliders);
      expect(getItemIcon("source", "Device")).toBe(Cpu);
      expect(getItemIcon("type", "All Types")).toBe(ArrowLeftRight);
      expect(getItemIcon(FieldType.ENTRY_STATUS, "All Statuses")).toBe(Activity);
      expect(getItemIcon(FieldType.ENTRY_STATUS, "Pending")).toBe(Clock);
      expect(getItemIcon("verification", "All Verifications")).toBe(ShieldCheck);
    });
  });

  describe("getItemColorClass", () => {
    it("applies no color override for unmapped or default 'all' values", () => {
      expect(getItemColorClass("unit", "all")).toBe("");
      expect(getItemColorClass("source", "all")).toBe("");
      expect(getItemColorClass("type", "all")).toBe("");
      expect(getItemColorClass(FieldType.ENTRY_STATUS, "all")).toBe("");
      expect(getItemColorClass("verification", "all")).toBe("");
      expect(getItemColorClass("role", "all")).toBe("");
      expect(getItemColorClass(ProjectSlug.CENTERS, "1")).toBe("");
    });

    it("resolves semantic colors for filter and combobox values", () => {
      expect(getItemColorClass("unit", Unit.KG)).toBe(
        "text-blue-700 dark:text-blue-300",
      );
      expect(getItemColorClass("source", EntrySource.DEVICE)).toBe(
        "text-sky-700 dark:text-sky-300",
      );
      expect(
        getItemColorClass(FieldType.ENTRY_STATUS, EntryStatus.APPROVED),
      ).toBe("text-emerald-700 dark:text-emerald-300");
      expect(getItemColorClass("verification", "false")).toBe(
        "text-amber-700 dark:text-amber-300",
      );
      expect(getItemColorClass("auto_approve", "false")).toBe(
        "text-red-700 dark:text-red-300",
      );
      expect(getItemColorClass("type", WeighmentType.OUT)).toBe(
        "text-orange-700 dark:text-orange-300",
      );
      expect(getItemColorClass("role", Role.ADMIN)).toBe(
        "text-purple-700 dark:text-purple-300",
      );
    });
  });
});
