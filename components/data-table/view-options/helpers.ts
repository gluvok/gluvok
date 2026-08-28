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
import { ColumnLabel } from "@/lib/constants/enums";

/**
 * COLUMN_ICONS mapping
 * Icons associated with common column keys (id, name, dates, requirement modes, etc.).
 */
export const COLUMN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  id: Hash,
  name: Tag,
  created_at: Calendar,
  updated_at: CalendarClock,
  images: Image,
  factory_id: Factory,
  factory_name: Factory,
  aadhar_number_mode: Fingerprint,
  govt_id_mode: ShieldCheck,
  aadhar_number: Fingerprint,
  govt_id: ShieldCheck,
  username: AtSign,
  user_id: User,
  unit_price: IndianRupee,
  unit: Ruler,
};

/**
 * getColumnLabel utility
 * Maps a database entity key/column ID to its corresponding UI label string.
 */
export function getColumnLabel(id: string): string {
  switch (id) {
    case "id":
      return ColumnLabel.ID;
    case "govt_id":
      return ColumnLabel.GOVT_ID;
    case "aadhar_number":
      return ColumnLabel.AADHAR_NUMBER;
    case "name":
      return ColumnLabel.NAME;
    case "factory_id":
      return ColumnLabel.FACTORY_ID;
    case "unit_price":
      return ColumnLabel.UNIT_PRICE;
    case "unit":
      return ColumnLabel.UNIT;
    case "father_name":
      return ColumnLabel.FATHER_NAME;
    case "username":
      return ColumnLabel.USERNAME;
    case "vehicle_number":
      return ColumnLabel.VEHICLE_NUMBER;
    case "weight":
      return ColumnLabel.WEIGHT;
    case "commodity_id":
      return ColumnLabel.COMMODITY_ID;
    case "commodity_name":
      return ColumnLabel.COMMODITY_NAME;
    case "rate_id":
      return ColumnLabel.RATE_ID;
    case "center_id":
      return ColumnLabel.CENTER_ID;
    case "customer_id":
      return ColumnLabel.CUSTOMER_ID;
    case "role":
      return ColumnLabel.ROLE;
    case "created_at":
      return ColumnLabel.CREATED_AT;
    case "updated_at":
      return ColumnLabel.UPDATED_AT;
    case "images":
      return ColumnLabel.IMAGES;
    case "user_id":
      return ColumnLabel.USER_ID;
    case "factory_name":
      return ColumnLabel.FACTORY_NAME;
    case "user_name":
      return ColumnLabel.USER_NAME;
    case "customer_name":
      return ColumnLabel.CUSTOMER_NAME;
    case "center_name":
      return ColumnLabel.CENTER_NAME;
    case "customer_govt_id":
      return ColumnLabel.GOVT_ID;
    case "commodity":
      return ColumnLabel.COMMODITY;
    case "factory":
      return ColumnLabel.FACTORY;
    case "user":
      return ColumnLabel.USER;
    case "rate":
      return ColumnLabel.RATE;
    case "center":
      return ColumnLabel.CENTER;
    case "customer":
      return ColumnLabel.CUSTOMER;
    case "aadhar_number_mode":
      return ColumnLabel.AADHAR_NUMBER_MODE;
    case "govt_id_mode":
      return ColumnLabel.GOVT_ID_MODE;
    case "in_entry_id":
      return ColumnLabel.IN_ENTRY_ID;
    case "out_entry_id":
      return ColumnLabel.OUT_ENTRY_ID;
    case "in_entry_created_at":
      return ColumnLabel.IN_ENTRY_CREATED_AT;
    case "out_entry_created_at":
      return ColumnLabel.OUT_ENTRY_CREATED_AT;
    case "gross_weight":
      return ColumnLabel.GROSS_WEIGHT;
    case "tare_weight":
      return ColumnLabel.TARE_WEIGHT;
    case "net_weight":
      return ColumnLabel.NET_WEIGHT;
    case "in_center_id":
      return ColumnLabel.IN_CENTER_ID;
    case "in_center_name":
      return ColumnLabel.IN_CENTER_NAME;
    case "out_center_id":
      return ColumnLabel.OUT_CENTER_ID;
    case "out_center_name":
      return ColumnLabel.OUT_CENTER_NAME;
    case "in_user_id":
      return ColumnLabel.IN_USER_ID;
    case "in_user_name":
      return ColumnLabel.IN_USER_NAME;
    case "out_user_id":
      return ColumnLabel.OUT_USER_ID;
    case "out_user_name":
      return ColumnLabel.OUT_USER_NAME;
    case "in_customer_id":
      return ColumnLabel.IN_CUSTOMER_ID;
    case "in_customer_name":
      return ColumnLabel.IN_CUSTOMER_NAME;
    case "out_customer_id":
      return ColumnLabel.OUT_CUSTOMER_ID;
    case "out_customer_name":
      return ColumnLabel.OUT_CUSTOMER_NAME;
    default:
      return id;
  }
}
