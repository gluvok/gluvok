/**
 * @file lib/fields/config.ts
 * @description Helper definitions or configuration for entity table fields (config).
 */

import { ProjectSlug, EntityKey, FieldType, InputMode, Role, SingularEntityName, FieldSpan } from "@/lib/constants/enums"
import { type FieldConfig } from "./types"
import { ColumnLabel } from "@/lib/constants/enums"
import { getSelectPlaceholder } from "./helpers"
import {
  Building,
  Factory,
  Package,
  Tag,
  IndianRupee,
  User,
  Car,
  Image,
  Weight,
  Ruler,
  Users,
  Power,
  ShieldCheck,
  Fingerprint,
  AtSign,
  ArrowLeftRight,
  KeyRound,
} from "lucide-react"

export const PROJECT_FIELDS: Record<string, FieldConfig[]> = {
  [ProjectSlug.CENTERS]: [
    { key: EntityKey.NAME, label: ColumnLabel.NAME, placeholder: "e.g. Center F", type: FieldType.TEXT, required: true, icon: Tag, span: FieldSpan.HALF },
    { key: EntityKey.FACTORY_ID, label: ColumnLabel.FACTORY, placeholder: getSelectPlaceholder(SingularEntityName.FACTORY), type: FieldType.TEXT, icon: Factory, visibleRoles: [Role.SUPER_ADMIN], editableRoles: [Role.SUPER_ADMIN], span: FieldSpan.HALF },
  ],
  [ProjectSlug.COMMODITIES]: [
    { key: EntityKey.NAME, label: ColumnLabel.NAME, placeholder: "e.g. Barley", type: FieldType.TEXT, required: true, icon: Tag, span: FieldSpan.FULL },
  ],
  [ProjectSlug.RATES]: [
    { key: EntityKey.COMMODITY_ID, label: ColumnLabel.COMMODITY, placeholder: getSelectPlaceholder(SingularEntityName.COMMODITY), type: FieldType.TEXT, required: true, icon: Tag, span: FieldSpan.THIRD },
    { key: EntityKey.UNIT_PRICE, label: ColumnLabel.UNIT_PRICE, placeholder: "e.g. 15000", type: FieldType.NUMBER, required: true, icon: IndianRupee, span: FieldSpan.THIRD },
    { key: EntityKey.UNIT, label: ColumnLabel.UNIT, placeholder: "Select unit...", type: FieldType.UNIT, required: true, icon: Ruler, span: FieldSpan.THIRD },
    { key: EntityKey.FACTORY_ID, label: ColumnLabel.FACTORY, placeholder: getSelectPlaceholder(SingularEntityName.FACTORY), type: FieldType.TEXT, icon: Factory, visibleRoles: [Role.SUPER_ADMIN], editableRoles: [Role.SUPER_ADMIN], span: FieldSpan.FULL },
  ],
  [ProjectSlug.CUSTOMERS]: [
    { key: EntityKey.GOVT_ID, label: ColumnLabel.GOVT_ID, placeholder: "e.g. 1001", type: FieldType.NUMBER, required: true, icon: ShieldCheck, span: FieldSpan.HALF },
    { key: EntityKey.NAME, label: ColumnLabel.NAME, placeholder: "e.g. Ajay Kumar", type: FieldType.TEXT, required: true, icon: Tag, span: FieldSpan.HALF },
    { key: EntityKey.FATHER_NAME, label: ColumnLabel.FATHER_NAME, placeholder: "e.g. Vijay Kumar", type: FieldType.TEXT, required: true, icon: User, span: FieldSpan.HALF },
    { key: EntityKey.USERNAME, label: ColumnLabel.USERNAME, placeholder: "e.g. ajay123 (optional)", type: FieldType.TEXT, icon: AtSign, span: FieldSpan.HALF },
    { key: EntityKey.PASSWORD, label: ColumnLabel.PASSWORD, placeholder: "Optional login password", type: FieldType.PASSWORD, icon: KeyRound, span: FieldSpan.HALF, newRow: true },
    { key: EntityKey.CONFIRM_PASSWORD, label: ColumnLabel.CONFIRM_PASSWORD, placeholder: "Repeat password", type: FieldType.PASSWORD, icon: KeyRound, span: FieldSpan.HALF },
    { key: EntityKey.FACTORY_ID, label: ColumnLabel.FACTORY, placeholder: getSelectPlaceholder(SingularEntityName.FACTORY), type: FieldType.TEXT, icon: Factory, visibleRoles: [Role.SUPER_ADMIN], editableRoles: [Role.SUPER_ADMIN], span: FieldSpan.FULL },
  ],
  [ProjectSlug.WEIGHMENTS]: [
    {
      key: EntityKey.VEHICLE_NUMBER,
      label: ColumnLabel.VEHICLE_NUMBER,
      placeholder: "e.g. PB10XY1234",
      type: FieldType.TEXT,
      required: true,
      className: "uppercase",
      transformOnChange: (v) => v.toUpperCase(),
      icon: Car,
      span: FieldSpan.HALF,
    },
    { key: EntityKey.CENTER_ID, label: ColumnLabel.CENTER, placeholder: getSelectPlaceholder(SingularEntityName.CENTER), type: FieldType.TEXT, required: true, icon: Building, span: FieldSpan.HALF },
    { key: EntityKey.WEIGHT, label: ColumnLabel.WEIGHT, placeholder: "e.g. 15.5", type: FieldType.NUMBER, required: true, icon: Weight, editVisibleRoles: [Role.SUPER_ADMIN, Role.ADMIN], span: FieldSpan.THIRD },
    { key: EntityKey.UNIT, label: ColumnLabel.UNIT, placeholder: "Select unit...", type: FieldType.UNIT, required: true, icon: Ruler, span: FieldSpan.THIRD },
    { key: EntityKey.TYPE, label: ColumnLabel.TYPE, placeholder: "Select type...", type: FieldType.TYPE, required: true, icon: ArrowLeftRight, span: FieldSpan.THIRD },
    { key: EntityKey.RATE_ID, label: ColumnLabel.RATE, placeholder: getSelectPlaceholder(SingularEntityName.RATE), type: FieldType.TEXT, required: true, icon: Package, span: FieldSpan.FULL },
    { key: EntityKey.IMAGES, label: ColumnLabel.IMAGES, placeholder: "Upload weighment photos...", type: FieldType.IMAGES, icon: Image, span: FieldSpan.FULL },
    { key: EntityKey.CUSTOMER_ID, label: ColumnLabel.CUSTOMER_NAME, placeholder: getSelectPlaceholder(SingularEntityName.CUSTOMER), type: FieldType.TEXT, required: true, icon: Users, span: FieldSpan.HALF },
    {
      key: EntityKey.PROFILE_ID,
      label: ColumnLabel.PROFILE_NAME,
      placeholder: getSelectPlaceholder(SingularEntityName.PROFILE),
      type: FieldType.TEXT,
      inputMode: InputMode.NUMERIC,
      transformOnChange: (v) => {
        const digits = v.replace(/\D/g, "").slice(0, 12)
        const match = digits.match(/(\d{1,4})/g)
        return match ? match.join(" ") : digits
      },
      icon: User,
      visibleRoles: [Role.SUPER_ADMIN, Role.ADMIN],
      span: FieldSpan.HALF,
    },
    { key: EntityKey.IS_ACTIVE, label: ColumnLabel.IS_ACTIVE, placeholder: "", type: FieldType.CHECKBOX, icon: Power, span: FieldSpan.FULL },
  ],
  [ProjectSlug.FACTORIES]: [
    { key: EntityKey.NAME, label: ColumnLabel.NAME, placeholder: "e.g. Factory C", type: FieldType.TEXT, required: true, icon: Tag, span: FieldSpan.FULL },
  ],
  [ProjectSlug.PROFILES]: [
    {
      key: EntityKey.AADHAR_NUMBER,
      label: ColumnLabel.AADHAR_NUMBER,
      placeholder: "e.g. 1234 5678 9012",
      type: FieldType.TEXT,
      required: true,
      inputMode: InputMode.NUMERIC,
      transformOnChange: (v) => {
        const digits = v.replace(/\D/g, "").slice(0, 12)
        const match = digits.match(/(\d{1,4})/g)
        return match ? match.join(" ") : digits
      },
      icon: Fingerprint,
      span: FieldSpan.HALF,
    },
    { key: EntityKey.NAME, label: ColumnLabel.NAME, placeholder: "e.g. Amit Sharma", type: FieldType.TEXT, required: true, icon: Tag, span: FieldSpan.HALF },
    { key: EntityKey.USERNAME, label: ColumnLabel.USERNAME, placeholder: "e.g. amits123", type: FieldType.TEXT, required: true, icon: AtSign, span: FieldSpan.HALF },
    { key: EntityKey.ROLE, label: ColumnLabel.ROLE, placeholder: "Select role...", type: FieldType.ROLE, required: true, icon: ShieldCheck, span: FieldSpan.HALF },
    { key: EntityKey.PASSWORD, label: ColumnLabel.PASSWORD, placeholder: "Account password", type: FieldType.PASSWORD, required: true, icon: KeyRound, span: FieldSpan.HALF, newRow: true },
    { key: EntityKey.CONFIRM_PASSWORD, label: ColumnLabel.CONFIRM_PASSWORD, placeholder: "Repeat password", type: FieldType.PASSWORD, required: true, icon: KeyRound, span: FieldSpan.HALF },
    { key: EntityKey.FACTORY_ID, label: ColumnLabel.FACTORY, placeholder: getSelectPlaceholder(SingularEntityName.FACTORY), type: FieldType.TEXT, icon: Factory, visibleRoles: [Role.SUPER_ADMIN], editableRoles: [Role.SUPER_ADMIN], span: FieldSpan.FULL },
  ],
  [ProjectSlug.CONFIGS]: [
    { key: EntityKey.AADHAR_NUMBER_MODE, label: ColumnLabel.AADHAR_NUMBER_MODE, placeholder: "Select Aadhaar Mode...", type: FieldType.FIELD_REQUIREMENT_MODE, required: true, icon: Fingerprint, span: FieldSpan.HALF },
    { key: EntityKey.GOVT_ID_MODE, label: ColumnLabel.GOVT_ID_MODE, placeholder: "Select Govt ID Mode...", type: FieldType.FIELD_REQUIREMENT_MODE, required: true, icon: ShieldCheck, span: FieldSpan.HALF },
    { key: EntityKey.FACTORY_ID, label: ColumnLabel.FACTORY, placeholder: getSelectPlaceholder(SingularEntityName.FACTORY), type: FieldType.TEXT, icon: Factory, visibleRoles: [Role.SUPER_ADMIN], editableRoles: [Role.SUPER_ADMIN], span: FieldSpan.FULL },
  ],
}

export const REQUIRED_CREATE_FIELDS: Record<string, EntityKey[]> = {
  [ProjectSlug.CENTERS]: [EntityKey.NAME],
  [ProjectSlug.COMMODITIES]: [EntityKey.NAME],
  [ProjectSlug.RATES]: [EntityKey.COMMODITY_ID, EntityKey.UNIT_PRICE, EntityKey.UNIT],
  [ProjectSlug.CUSTOMERS]: [EntityKey.GOVT_ID, EntityKey.NAME, EntityKey.FATHER_NAME],
  [ProjectSlug.WEIGHMENTS]: [
    EntityKey.VEHICLE_NUMBER,
    EntityKey.WEIGHT,
    EntityKey.RATE_ID,
    EntityKey.CENTER_ID,
    EntityKey.PROFILE_ID,
    EntityKey.CUSTOMER_ID,
  ],
  [ProjectSlug.FACTORIES]: [EntityKey.NAME],
  [ProjectSlug.PROFILES]: [
    EntityKey.AADHAR_NUMBER,
    EntityKey.NAME,
    EntityKey.USERNAME,
    EntityKey.PASSWORD,
    EntityKey.CONFIRM_PASSWORD,
  ],
  [ProjectSlug.CONFIGS]: [
    EntityKey.AADHAR_NUMBER_MODE,
    EntityKey.GOVT_ID_MODE,
  ],
}

