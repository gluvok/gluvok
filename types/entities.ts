/**
 * @file types/entities.ts
 * @description Core TypeScript interfaces representing the application's database entities.
 * Includes flattened and computed fields used across views and forms.
 */

import { Role, Unit, WeighmentType, EntrySource, EntryStatus } from "@/lib/constants/enums";

/**
 * Center Entity
 * Represents physical collection centers.
 */
export interface Center {
  id: number;
  name: string;
  auto_approve: boolean;
  factory_id: number;
  created_at: string;
  updated_at: string;
  // Flattened join fields
  factory_name?: string;
}

/**
 * Commodity Entity
 * Represents raw products/materials (e.g. sugar cane, wheat).
 */
export interface Commodity {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Rate {
  id: number;
  commodity_id: number;
  unit_price: string;
  unit: Unit;
  factory_id: number;
  created_at: string;
  updated_at: string;
  // Flattened join fields
  commodity_name?: string;
  factory_name?: string;
}

export interface Customer {
  id: number;
  name: string;
  father_name: string;
  user_id?: number | null;
  factory_id: number;
  created_at: string;
  updated_at: string;
  // Flattened join fields
  username?: string;
  factory_name?: string;
}

export interface Factory {
  id: number;
  name: string;
  check_center_on_merge?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: number;
  detected_vehicle_number?: string | null;
  vehicle_number: string;
  weight: number | string;
  source: EntrySource;
  center_id: number;
  user_id: number;
  customer_id?: number | null;
  factory_id: number;
  status: EntryStatus;
  auto_approved: boolean;
  edited?: boolean;
  images: string[];
  created_at: string;
  updated_at: string;
  // Flattened join fields
  center_name?: string;
  user_name?: string;
  customer_name?: string;
  linked_weighment?: { id: number; partner_entry_id: number } | null;
}

export interface Weighment {
  id: number;
  in_entry_id: number;
  out_entry_id: number;
  unit: Unit;
  type: WeighmentType;
  rate_id?: number | null;
  created_at: string;
  updated_at: string;
  // Flattened join/computed fields
  gross_weight?: string | number;
  tare_weight?: string | number;
  net_weight?: string | number;
  vehicle_number?: string;
  center_name?: string;
  user_name?: string;
  customer_name?: string;
  commodity_name?: string;
  unit_price?: string | number;
}

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  factory_id: number;
  token_version?: number;
  created_at: string;
  updated_at: string;
  // Flattened join/view fields
  factory_name?: string;
}

/** Union of all entity types used across the app */
export type EntityRecord =
  | Center
  | Commodity
  | Rate
  | Customer
  | Weighment
  | Entry
  | Factory
  | User;
