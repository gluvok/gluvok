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
  Weight,
  Truck,
  Calculator,
} from "lucide-react";

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
  weight: Weight,
  gross_weight: Weight,
  tare_weight: Truck,
  net_weight: Calculator,
};

const COLUMN_LABEL_MAP: Record<string, string> = {
  id: "ID",
  govt_id: "Govt ID",
  aadhar_number: "Aadhar Number",
  name: "Name",
  factory_id: "Factory ID",
  unit_price: "Unit Price",
  unit: "Unit",
  father_name: "Father's Name",
  username: "Username",
  vehicle_number: "Vehicle Number",
  weight: "Weight",
  commodity_id: "Commodity ID",
  commodity_name: "Commodity Name",
  rate_id: "Rate ID",
  center_id: "Center ID",
  customer_id: "Customer ID",
  role: "Role",
  created_at: "Created At",
  updated_at: "Updated At",
  images: "Images",
  user_id: "User ID",
  factory_name: "Factory Name",
  user_name: "User Name",
  customer_name: "Customer Name",
  center_name: "Center Name",
  customer_govt_id: "Govt ID",
  commodity: "Commodity",
  factory: "Factory",
  user: "User",
  rate: "Rate",
  center: "Center",
  customer: "Customer",
  aadhar_number_mode: "Aadhaar Number Mode",
  govt_id_mode: "Govt ID Mode",
  in_entry_id: "In-Entry ID",
  out_entry_id: "Out-Entry ID",
  in_entry_created_at: "In-Entry Time",
  out_entry_created_at: "Out-Entry Time",
  gross_weight: "Gross Weight",
  tare_weight: "Tare Weight",
  net_weight: "Net Weight",
  in_center_id: "In-Center ID",
  in_center_name: "In-Center Name",
  out_center_id: "Out-Center ID",
  out_center_name: "Out-Center Name",
  in_user_id: "In-User ID",
  in_user_name: "In-User Name",
  out_user_id: "Out-User ID",
  out_user_name: "Out-User Name",
  in_customer_id: "In-Customer ID",
  in_customer_name: "In-Customer Name",
  out_customer_id: "Out-Customer ID",
  out_customer_name: "Out-Customer Name",
};

/**
 * getColumnLabel utility
 * Maps a database entity key/column ID to its corresponding UI label string.
 */
export function getColumnLabel(id: string): string {
  return COLUMN_LABEL_MAP[id] ?? id;
}
