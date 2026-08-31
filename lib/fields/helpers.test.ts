import { describe, it, expect } from "vitest";
import {
  getCommodityIcon,
  getStatusIcon,
  getSourceIcon,
  getTypeIcon,
  getAutoApproveIcon,
  getItemIcon,
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
} from "lucide-react";
import {
  EntrySource,
  EntryStatus,
  FieldType,
  ProjectSlug,
  WeighmentType,
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
});
