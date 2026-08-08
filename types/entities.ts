/**
 * @file types/entities.ts
 * @description Core TypeScript interfaces representing the application's database entities.
 * Includes flattened and computed fields used across views and forms.
 */

import { Role, Unit, WeighmentType, FieldRequirementMode } from "@/lib/constants/enums"

/**
 * Center Entity
 * Represents physical collection centers.
 */
export interface Center {
  id: number
  name: string
  factory_id: number
  created_at: string
  updated_at: string
  // Flattened join fields
  factory_name?: string
}

/**
 * Commodity Entity
 * Represents raw products/materials (e.g. sugar cane, wheat).
 */
export interface Commodity {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface Rate {
  id: number
  commodity_id: number
  unit_price: string
  unit: Unit
  factory_id: number
  created_at: string
  updated_at: string
  // Flattened join fields
  commodity_name?: string
  factory_name?: string
}

export interface Customer {
  id: number
  govt_id?: number | null
  aadhar_number?: string | null
  name: string
  father_name: string
  user_id?: string
  factory_id: number
  is_active?: boolean
  created_at: string
  updated_at: string
  // Flattened join fields
  username?: string
  factory_name?: string
}

export interface Factory {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface Config {
  id: number
  name?: string
  factory_id?: number
  aadhar_number_mode: FieldRequirementMode
  govt_id_mode: FieldRequirementMode
  created_at: string
  updated_at: string
  // Flattened join fields
  factory_name?: string
}

export interface Weighment {
  id: number
  vehicle_number: string
  weight: string
  unit: Unit
  type: WeighmentType
  images: string[]
  rate_id: number
  center_id: number
  profile_id: number
  customer_id: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Flattened join fields
  center_name?: string
  profile_name?: string
  profile_aadhar?: string
  customer_name?: string
  customer_govt_id?: number
  commodity_id?: number
  commodity_name?: string
  unit_price?: string
}

export interface Profile {
  id: number
  user_id: string
  aadhar_number?: string | null
  name: string
  role: Role
  is_active?: boolean
  preferences?: Record<string, string[]>
  created_at: string
  updated_at: string
  factory_id?: number | null
  factory?: { name: string } | null
  // Flattened join/view fields
  username?: string
  factory_name?: string
}

/** Union of all entity types used across the app */
export type EntityRecord =
  | Center
  | Commodity
  | Rate
  | Customer
  | Weighment
  | Factory
  | Profile
  | Config

