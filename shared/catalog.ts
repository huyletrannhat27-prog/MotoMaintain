import type { AppData, VehicleType } from './types'

export const vehicleGroups: { type: VehicleType; label: string; examples: string }[] = [
  { type: 'scooter', label: 'Xe tay ga', examples: 'Air Blade (AB), SH, Vision, Lead' },
  { type: 'semi-auto', label: 'Xe số', examples: 'Wave, Sirius' },
]
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
export function matchesModel(name: string, query: string): boolean {
  const q = normalizeText(query).replace(/\bab\b/g, 'air blade')
  return q.split(' ').every((word) => normalizeText(name).includes(word))
}
export function groupOwnedVehicles(data: Pick<AppData, 'vehicles' | 'userVehicles'>) {
  const models = new Map(data.vehicles.map((v) => [v.id, v]))
  return vehicleGroups.map((group) => ({
    ...group,
    vehicles: data.userVehicles.filter((v) => models.get(v.vehicle_id)?.type === group.type),
  }))
}
