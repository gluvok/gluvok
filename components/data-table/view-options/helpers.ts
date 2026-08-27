/**
 * @file components/data-table/view-options/helpers.ts
 * @description Helpers for mapping column IDs to human-readable names and display icons.
 */

import {
  Hash,
  Calendar,
  CalendarClock,
  Image,
  Tag,
  Factory,
  Fingerprint,
  ShieldCheck,
  User,
  AtSign,
  IndianRupee,
  Ruler,
} from "lucide-react";
import { ColumnLabel, EntityKey } from "@/lib/constants/enums";

/**
 * COLUMN_ICONS mapping
 * Icons associated with common column keys (id, name, dates, requirement modes, etc.).
 */
export const COLUMN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  [EntityKey.ID]: Hash,
  [EntityKey.NAME]: Tag,
  [EntityKey.CREATED_AT]: Calendar,
  [EntityKey.UPDATED_AT]: CalendarClock,
  [EntityKey.IMAGES]: Image,
  [EntityKey.FACTORY_ID]: Factory,
  [EntityKey.FACTORY_NAME]: Factory,
  [EntityKey.AADHAR_NUMBER_MODE]: Fingerprint,
  [EntityKey.GOVT_ID_MODE]: ShieldCheck,
  [EntityKey.AADHAR_NUMBER]: Fingerprint,
  [EntityKey.GOVT_ID]: ShieldCheck,
  [EntityKey.USERNAME]: AtSign,
  [EntityKey.USER_ID]: User,
  [EntityKey.UNIT_PRICE]: IndianRupee,
  [EntityKey.UNIT]: Ruler,
};

/**
 * getColumnLabel utility
 * Maps a database entity key/column ID to its corresponding UI label string.
 */
export function getColumnLabel(id: string): string {
  switch (id) {
    case EntityKey.ID:
      return ColumnLabel.ID;
    case EntityKey.GOVT_ID:
      return ColumnLabel.GOVT_ID;
    case EntityKey.AADHAR_NUMBER:
      return ColumnLabel.AADHAR_NUMBER;
    case EntityKey.NAME:
      return ColumnLabel.NAME;
    case EntityKey.FACTORY_ID:
      return ColumnLabel.FACTORY_ID;
    case EntityKey.UNIT_PRICE:
      return ColumnLabel.UNIT_PRICE;
    case EntityKey.UNIT:
      return ColumnLabel.UNIT;
    case EntityKey.FATHER_NAME:
      return ColumnLabel.FATHER_NAME;
    case EntityKey.USERNAME:
      return ColumnLabel.USERNAME;
    case EntityKey.VEHICLE_NUMBER:
      return ColumnLabel.VEHICLE_NUMBER;
    case EntityKey.WEIGHT:
      return ColumnLabel.WEIGHT;
    case EntityKey.COMMODITY_ID:
      return ColumnLabel.COMMODITY_ID;
    case EntityKey.COMMODITY_NAME:
      return ColumnLabel.COMMODITY_NAME;
    case EntityKey.RATE_ID:
      return ColumnLabel.RATE_ID;
    case EntityKey.CENTER_ID:
      return ColumnLabel.CENTER_ID;
    case EntityKey.CUSTOMER_ID:
      return ColumnLabel.CUSTOMER_ID;
    case EntityKey.ROLE:
      return ColumnLabel.ROLE;
    case EntityKey.CREATED_AT:
      return ColumnLabel.CREATED_AT;
    case EntityKey.UPDATED_AT:
      return ColumnLabel.UPDATED_AT;
    case EntityKey.IMAGES:
      return ColumnLabel.IMAGES;
    case EntityKey.USER_ID:
      return ColumnLabel.USER_ID;
    case EntityKey.FACTORY_NAME:
      return ColumnLabel.FACTORY_NAME;
    case EntityKey.USER_NAME:
      return ColumnLabel.USER_NAME;
    case EntityKey.CUSTOMER_NAME:
      return ColumnLabel.CUSTOMER_NAME;
    case EntityKey.CENTER_NAME:
      return ColumnLabel.CENTER_NAME;
    case EntityKey.CUSTOMER_GOVT_ID:
      return ColumnLabel.GOVT_ID;
    case EntityKey.COMMODITY:
      return ColumnLabel.COMMODITY;
    case EntityKey.FACTORY:
      return ColumnLabel.FACTORY;
    case EntityKey.USER:
      return ColumnLabel.USER;
    case EntityKey.RATE:
      return ColumnLabel.RATE;
    case EntityKey.CENTER:
      return ColumnLabel.CENTER;
    case EntityKey.CUSTOMER:
      return ColumnLabel.CUSTOMER;
    case EntityKey.AADHAR_NUMBER_MODE:
      return ColumnLabel.AADHAR_NUMBER_MODE;
    case EntityKey.GOVT_ID_MODE:
      return ColumnLabel.GOVT_ID_MODE;
    case EntityKey.IN_ENTRY_ID:
      return ColumnLabel.IN_ENTRY_ID;
    case EntityKey.OUT_ENTRY_ID:
      return ColumnLabel.OUT_ENTRY_ID;
    case EntityKey.IN_ENTRY_CREATED_AT:
      return ColumnLabel.IN_ENTRY_CREATED_AT;
    case EntityKey.OUT_ENTRY_CREATED_AT:
      return ColumnLabel.OUT_ENTRY_CREATED_AT;
    case EntityKey.GROSS_WEIGHT:
      return ColumnLabel.GROSS_WEIGHT;
    case EntityKey.TARE_WEIGHT:
      return ColumnLabel.TARE_WEIGHT;
    case EntityKey.NET_WEIGHT:
      return ColumnLabel.NET_WEIGHT;
    case EntityKey.IN_CENTER_ID:
      return ColumnLabel.IN_CENTER_ID;
    case EntityKey.IN_CENTER_NAME:
      return ColumnLabel.IN_CENTER_NAME;
    case EntityKey.OUT_CENTER_ID:
      return ColumnLabel.OUT_CENTER_ID;
    case EntityKey.OUT_CENTER_NAME:
      return ColumnLabel.OUT_CENTER_NAME;
    case EntityKey.IN_USER_ID:
      return ColumnLabel.IN_USER_ID;
    case EntityKey.IN_USER_NAME:
      return ColumnLabel.IN_USER_NAME;
    case EntityKey.OUT_USER_ID:
      return ColumnLabel.OUT_USER_ID;
    case EntityKey.OUT_USER_NAME:
      return ColumnLabel.OUT_USER_NAME;
    case EntityKey.IN_CUSTOMER_ID:
      return ColumnLabel.IN_CUSTOMER_ID;
    case EntityKey.IN_CUSTOMER_NAME:
      return ColumnLabel.IN_CUSTOMER_NAME;
    case EntityKey.OUT_CUSTOMER_ID:
      return ColumnLabel.OUT_CUSTOMER_ID;
    case EntityKey.OUT_CUSTOMER_NAME:
      return ColumnLabel.OUT_CUSTOMER_NAME;
    default:
      return id;
  }
}
