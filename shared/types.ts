export type VehicleType = 'scooter' | 'semi-auto'

export interface Vehicle {
  is_active?: boolean
  id: string
  name: string
  model: string
  type: VehicleType
  brand: string
  image_url?: string
  engine_cc: number
  oil_capacity_liters: number
  description?: string
  created_at: string
  updated_at: string
}

export interface MaintenanceItem {
  first_service_km?: number | null
  odometer_based?: boolean
  verified?: boolean
  source_url?: string
  id: string
  vehicle_id: string
  name: string
  description?: string
  interval_km: number
  interval_months: number
  estimated_cost_min: number
  estimated_cost_max: number
  is_critical: boolean
  category: 'engine' | 'brake' | 'filter' | 'electrical' | 'tires' | 'body' | 'other'
  created_at: string
  updated_at: string
}

export interface MaintenanceSchedule {
  id: string
  vehicle_id: string
  name: string
  km_intervals: number[]
  description?: string
  items: string[] // MaintenanceItem IDs
  created_at: string
  updated_at: string
}

export interface UserVehicle {
  id: string
  user_id: string
  vehicle_id: string
  nickname?: string
  license_plate?: string
  purchase_date?: string
  current_km: number
  color?: string
  year?: number
  vehicle?: Vehicle
  created_at: string
  updated_at: string
}

export interface MaintenanceRecord {
  id: string
  user_vehicle_id: string
  user_id: string
  date: string
  km_at_maintenance: number
  items_maintained: string[] // MaintenanceItem IDs
  notes?: string
  cost?: number
  shop_name?: string
  next_maintenance_km?: number
  next_maintenance_date?: string
  user_vehicle?: UserVehicle & { vehicle?: Vehicle }
  maintenance_items?: MaintenanceItem[]
  created_at: string
  updated_at: string
}

export interface PartsSuggestion {
  id: string
  vehicle_id: string
  maintenance_item_id: string
  part_name: string
  part_number?: string
  brand?: string
  estimated_price_min: number
  estimated_price_max: number
  replace_interval_km: number
  replace_interval_months?: number
  notes?: string
  created_at: string
}

export interface HondaStore {
  is_active?: boolean
  id: string
  name: string
  address: string
  phone?: string
  lat: number
  lng: number
  city: string
  district?: string
  opening_hours?: string
  services?: string[]
  rating?: number
}

export interface Profile {
  id: string
  email: string
  full_name?: string
  phone?: string
  role: 'user' | 'admin'
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface AppData {
  vehicles: Vehicle[]
  userVehicles: UserVehicle[]
  items: MaintenanceItem[]
  records: MaintenanceRecord[]
  parts: PartsSuggestion[]
  stores: HondaStore[]
  profile: Profile
}
export type VehicleInput = Pick<
  UserVehicle,
  'vehicle_id' | 'nickname' | 'license_plate' | 'purchase_date' | 'current_km' | 'color' | 'year'
>
export type RecordInput = Pick<
  MaintenanceRecord,
  | 'user_vehicle_id'
  | 'date'
  | 'km_at_maintenance'
  | 'items_maintained'
  | 'cost'
  | 'shop_name'
  | 'notes'
>
