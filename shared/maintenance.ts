import type {
  AppData,
  MaintenanceItem,
  MaintenanceRecord,
  RecordInput,
  UserVehicle,
  VehicleInput,
} from './types'
import { learnRidingRate, type RidingEstimate } from './learning'

export type Urgency = 'overdue' | 'urgent' | 'soon' | 'ok' | 'unknown'
export const statusLabels: Record<Urgency, string> = {
  overdue: 'Quá hạn',
  urgent: 'Đến hạn',
  soon: 'Sắp đến hạn',
  ok: 'Chưa đến hạn',
  unknown: 'Chưa đủ dữ liệu',
}
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}
export function addCalendarMonths(day: string, months: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10)
}
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000)
}
export function money(value: number): string {
  return value.toLocaleString('vi-VN') + ' đ'
}
export function km(value: number): string {
  return value.toLocaleString('vi-VN') + ' km'
}
export function dateLabel(value?: string): string {
  return value && validDate(value) ? value.split('-').reverse().join('/') : 'Chưa có'
}
export function vehicleLabel(v: UserVehicle, data: AppData): string {
  return v.nickname || data.vehicles.find((x) => x.id === v.vehicle_id)?.name || 'Xe của tôi'
}
export interface Recommendation {
  riding?: RidingEstimate
  predictedDate?: string
  vehicle: UserVehicle
  item: MaintenanceItem
  lastRecord?: MaintenanceRecord
  nextKm?: number
  nextDate?: string
  kmRemaining?: number
  daysRemaining?: number
  progress: number
  urgency: Urgency
  reason: string
}
export function recommendations(
  data: Pick<AppData, 'userVehicles' | 'items' | 'records'>,
  today = todayISO(),
): Recommendation[] {
  const result: Recommendation[] = []
  const latest = new Map<string, MaintenanceRecord>()
  const history = new Map<string, MaintenanceRecord[]>()
  const itemsByModel = new Map<string, MaintenanceItem[]>()
  for (const item of data.items) {
    const list = itemsByModel.get(item.vehicle_id) || []
    list.push(item)
    itemsByModel.set(item.vehicle_id, list)
  }
  for (const record of data.records) {
    if (!validDate(record.date) || record.date > today) continue
    const list = history.get(record.user_vehicle_id) || []
    list.push(record)
    history.set(record.user_vehicle_id, list)
    for (const itemId of record.items_maintained) {
      const key = `${record.user_vehicle_id}:${itemId}`
      const old = latest.get(key)
      if (
        !old ||
        record.date > old.date ||
        (record.date === old.date &&
          (record.km_at_maintenance > old.km_at_maintenance ||
            (record.km_at_maintenance === old.km_at_maintenance &&
              record.created_at > old.created_at)))
      )
        latest.set(key, record)
    }
  }
  for (const vehicle of data.userVehicles) {
    const riding = learnRidingRate(vehicle, history.get(vehicle.id) || [], today)
    for (const item of itemsByModel.get(vehicle.vehicle_id) || []) {
      const lastRecord = latest.get(`${vehicle.id}:${item.id}`)
      if (
        !lastRecord ||
        !validDate(lastRecord.date) ||
        !Number.isSafeInteger(item.interval_km) ||
        !Number.isSafeInteger(item.interval_months) ||
        item.interval_km < 0 ||
        item.interval_months < 0 ||
        (item.interval_km === 0 && item.interval_months === 0) ||
        vehicle.current_km < lastRecord.km_at_maintenance
      ) {
        result.push({
          vehicle,
          item,
          progress: 0,
          urgency: 'unknown',
          reason: 'Bổ sung lần thực hiện gần nhất của hạng mục này để tính mốc tiếp theo.',
        })
        continue
      }
      const nextKm =
        item.interval_km > 0
          ? item.odometer_based
            ? item.first_service_km && lastRecord.km_at_maintenance < item.first_service_km
              ? item.first_service_km
              : (Math.floor(lastRecord.km_at_maintenance / item.interval_km) + 1) * item.interval_km
            : lastRecord.km_at_maintenance + item.interval_km
          : undefined
      const nextDate =
        item.interval_months > 0
          ? addCalendarMonths(lastRecord.date, item.interval_months)
          : undefined
      const kmRemaining = nextKm != null ? nextKm - vehicle.current_km : undefined
      const daysRemaining = nextDate ? daysBetween(today, nextDate) : undefined
      const k = kmRemaining ?? Infinity
      const d = daysRemaining ?? Infinity
      const urgency: Urgency =
        k < 0 || d < 0
          ? 'overdue'
          : k <= 200 || d <= 7
            ? 'urgent'
            : k <= 500 || d <= 30
              ? 'soon'
              : 'ok'
      const elapsed = Math.max(0, daysBetween(lastRecord.date, today))
      const progress = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            100 *
              Math.max(
                nextKm != null
                  ? (vehicle.current_km - lastRecord.km_at_maintenance) /
                      Math.max(1, nextKm - lastRecord.km_at_maintenance)
                  : 0,
                nextDate ? elapsed / Math.max(1, daysBetween(lastRecord.date, nextDate)) : 0,
              ),
          ),
        ),
      )
      const reason =
        [
          kmRemaining != null ? `${k < 0 ? 'Vượt' : 'Còn'} ${km(Math.abs(k))}` : '',
          daysRemaining != null ? `${d < 0 ? 'Trễ' : 'Còn'} ${Math.abs(d)} ngày` : '',
        ]
          .filter(Boolean)
          .join('; ') + '. Theo mốc đến trước.'
      const forecastDays =
        riding.kmPerDay && nextKm != null && riding.lastKm != null
          ? Math.ceil(Math.max(0, nextKm - riding.lastKm) / riding.kmPerDay)
          : undefined
      const predictedDate =
        forecastDays != null && forecastDays <= 730 && riding.lastDate
          ? new Date(Date.parse(riding.lastDate) + forecastDays * 86400000)
              .toISOString()
              .slice(0, 10)
          : undefined
      result.push({
        vehicle,
        item,
        lastRecord,
        riding,
        predictedDate,
        nextKm,
        nextDate,
        kmRemaining,
        daysRemaining,
        progress,
        urgency,
        reason,
      })
    }
  }
  const order: Record<Urgency, number> = { overdue: 0, urgent: 1, soon: 2, unknown: 3, ok: 4 }
  return result.sort(
    (a, b) =>
      order[a.urgency] - order[b.urgency] ||
      (a.daysRemaining ?? Infinity) - (b.daysRemaining ?? Infinity),
  )
}
export function validateVehicle(
  input: VehicleInput,
  records: MaintenanceRecord[] = [],
  vehicleId?: string,
): void {
  if (!input.vehicle_id) throw new Error('Hãy chọn mẫu xe.')
  if (
    !Number.isSafeInteger(input.current_km) ||
    input.current_km < 0 ||
    input.current_km > 2147483647
  )
    throw new Error('Số km phải là số nguyên không âm hợp lệ.')
  if (input.purchase_date && (!validDate(input.purchase_date) || input.purchase_date > todayISO()))
    throw new Error('Ngày mua xe không hợp lệ.')
  if (
    input.year != null &&
    (!Number.isInteger(input.year) ||
      input.year < 1950 ||
      input.year > Number(todayISO().slice(0, 4)) + 1)
  )
    throw new Error('Năm sản xuất không hợp lệ.')
  if (
    input.current_km <
    records.reduce(
      (max, r) => (r.user_vehicle_id === vehicleId ? Math.max(max, r.km_at_maintenance) : max),
      0,
    )
  )
    throw new Error('Số km hiện tại không được thấp hơn lịch sử bảo dưỡng.')
}
export function validateRecord(
  input: RecordInput,
  data: Pick<AppData, 'userVehicles' | 'items' | 'records'>,
  id?: string,
): void {
  const vehicle = data.userVehicles.find((v) => v.id === input.user_vehicle_id)
  if (!vehicle) throw new Error('Hãy chọn xe của bạn.')
  if (!validDate(input.date) || input.date > todayISO())
    throw new Error('Ngày bảo dưỡng phải hợp lệ và không ở tương lai.')
  if (
    !Number.isSafeInteger(input.km_at_maintenance) ||
    input.km_at_maintenance < 0 ||
    input.km_at_maintenance > 2147483647
  )
    throw new Error('Số km không hợp lệ.')
  if (
    input.cost != null &&
    (!Number.isSafeInteger(input.cost) || input.cost < 0 || input.cost > 2147483647)
  )
    throw new Error('Chi phí phải là số nguyên không âm hợp lệ.')
  if (
    !input.items_maintained.length ||
    new Set(input.items_maintained).size !== input.items_maintained.length ||
    input.items_maintained.some(
      (i) => !data.items.some((x) => x.id === i && x.vehicle_id === vehicle.vehicle_id),
    )
  )
    throw new Error('Chọn ít nhất một hạng mục đúng mẫu xe.')
  for (const r of data.records.filter((r) => r.user_vehicle_id === vehicle.id && r.id !== id)) {
    if (
      (r.date < input.date && r.km_at_maintenance > input.km_at_maintenance) ||
      (r.date > input.date && r.km_at_maintenance < input.km_at_maintenance)
    )
      throw new Error('Số km không khớp thứ tự ngày trong lịch sử bảo dưỡng.')
  }
}
