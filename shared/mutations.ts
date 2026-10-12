import type { AppData, RecordInput, VehicleInput } from './types'
import { validateRecord, validateVehicle } from './maintenance'
export function saveDemoVehicle(
  data: AppData,
  input: VehicleInput,
  id = `v-${Date.now()}`,
): AppData {
  validateVehicle(input, data.records, id)
  const old = data.userVehicles.find((v) => v.id === id)
  if (
    old &&
    old.vehicle_id !== input.vehicle_id &&
    data.records.some((r) => r.user_vehicle_id === id)
  )
    throw new Error('Xe có lịch sử không thể đổi mẫu xe.')
  if (!data.vehicles.some((v) => v.id === input.vehicle_id))
    throw new Error('Mẫu xe không tồn tại.')
  const stamp = new Date().toISOString()
  const row = {
    ...old,
    ...input,
    id,
    user_id: data.profile.id,
    created_at: old?.created_at || stamp,
    updated_at: stamp,
  }
  return { ...data, userVehicles: [...data.userVehicles.filter((v) => v.id !== id), row] }
}
export function saveDemoRecord(data: AppData, input: RecordInput, id = `r-${Date.now()}`): AppData {
  validateRecord(input, data, id)
  const old = data.records.find((r) => r.id === id)
  if (old && old.user_vehicle_id !== input.user_vehicle_id)
    throw new Error('Không thể chuyển bản ghi sang xe khác.')
  const stamp = new Date().toISOString()
  return {
    ...data,
    records: [
      ...data.records.filter((r) => r.id !== id),
      {
        ...input,
        id,
        user_id: data.profile.id,
        created_at: old?.created_at || stamp,
        updated_at: stamp,
      },
    ],
    userVehicles: data.userVehicles.map((v) =>
      v.id === input.user_vehicle_id
        ? { ...v, current_km: Math.max(v.current_km, input.km_at_maintenance) }
        : v,
    ),
  }
}
