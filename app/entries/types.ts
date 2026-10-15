export interface EntryCenter {
  id: number;
  name: string;
}

export interface EntryUserRef {
  id: number;
  name: string;
  role?: string;
}

export interface Entry {
  id: number;
  detected_vehicle_number: string | null;
  vehicle_number: string;
  weight: number;
  center_id: number;
  customer_id: number | null;
  factory_id: number;
  created_by: number;
  images: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  center?: EntryCenter | null;
  customer?: EntryUserRef | null;
  created_by_user?: EntryUserRef | null;
}
