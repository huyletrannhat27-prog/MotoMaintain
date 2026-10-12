import type { MaintenanceItem, MaintenanceRecord, UserVehicle } from './types'
import { normalizeText } from './catalog'

const day = (s: string) => Date.parse(s + 'T00:00:00Z') / 86400000
const median = (v: number[]) => {
  const a = [...v].sort((x, y) => x - y)
  return a.length ? (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2 : 0
}
export interface RidingEstimate {
  lastDate?: string
  lastKm?: number
  kmPerDay?: number
  samples: number
  reason: string
}
/** Bounded Theil–Sen slope: max 60 observations, <=1770 pairs, per vehicle only. */
export function learnRidingRate(
  vehicle: UserVehicle,
  records: MaintenanceRecord[],
  today: string,
): RidingEstimate {
  const byDay = new Map<string, number>()
  for (const r of records) {
    if (
      r.user_vehicle_id !== vehicle.id ||
      r.date > today ||
      !/^\d{4}-\d{2}-\d{2}$/.test(r.date) ||
      !Number.isFinite(day(r.date)) ||
      new Date(r.date + 'T00:00:00Z').toISOString().slice(0, 10) !== r.date ||
      !Number.isSafeInteger(r.km_at_maintenance) ||
      r.km_at_maintenance < 0
    )
      continue
    byDay.set(r.date, Math.max(byDay.get(r.date) ?? 0, r.km_at_maintenance))
  }
  // Current odometer has no observation date: never pretend it was measured today.
  const points = [...byDay]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 60)
    .reverse()
  const samples = points.length
  if (samples < 3 || day(points.at(-1)![0]) - day(points[0][0]) < 30)
    return {
      samples,
      reason: 'Cần ít nhất 3 ngày ghi nhận trải dài 30 ngày để ước tính mức sử dụng.',
    }
  if (day(today) - day(points.at(-1)![0]) > 90)
    return { samples, reason: 'Lịch sử quá 90 ngày; cần thêm lần ghi nhận mới để dự báo.' }
  if (points.some((p, i) => i > 0 && p[1] < points[i - 1][1]))
    return { samples, reason: 'Số km trong lịch sử bị giảm; cần kiểm tra trước khi dự báo.' }
  const slopes: number[] = []
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      const days = day(points[j][0]) - day(points[i][0])
      if (days >= 7) slopes.push((points[j][1] - points[i][1]) / days)
    }
  const rate = median(slopes)
  const dispersion = median(slopes.map((x) => Math.abs(x - rate)))
  if (rate < 1 || rate > 500 || dispersion / rate > 0.6)
    return { samples, reason: 'Tần suất chạy chưa ổn định; chưa hiển thị ngày dự báo.' }
  return {
    samples,
    lastDate: points.at(-1)![0],
    lastKm: points.at(-1)![1],
    kmPerDay: Math.round(rate * 10) / 10,
    reason: `Ước tính từ ${samples} ngày ghi nhận; thay đổi khi có lịch sử mới.`,
  }
}

const stop = new Set(['da', 'va', 'xe', 'tai', 'hom', 'nay', 'cho', 'cua', 'toi', 'roi'])
export function tokens(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((t) => t.length > 1 && !stop.has(t) && !/^\d+$/.test(t))
    .slice(0, 160)
}
export interface NoteModel {
  labels: Record<string, { count: number; total: number; words: Record<string, number> }>
  vocabulary: string[]
  samples: number
}
export function emptyNoteModel(): NoteModel {
  return { labels: Object.create(null), vocabulary: [], samples: 0 }
}
/** Multinomial NB sufficient statistics; single-label examples avoid ambiguous attribution. */
export function trainNote(model: NoteModel, text: string, label: string): void {
  const ts = tokens(text)
  if (!ts.length) return
  if (!Object.hasOwn(model.labels, label))
    model.labels[label] = { count: 0, total: 0, words: Object.create(null) }
  const row = model.labels[label]
  const vocabulary = new Set(model.vocabulary)
  row.count++
  model.samples++
  for (const token of ts) {
    // Fixed upper bound prevents vocabulary growth on arbitrary text imports.
    if (!vocabulary.has(token) && vocabulary.size >= 4096) continue
    vocabulary.add(token)
    row.words[token] = (Object.hasOwn(row.words, token) ? row.words[token] : 0) + 1
    row.total++
  }
  model.vocabulary = [...vocabulary]
}
export function classifyNote(
  model: NoteModel,
  text: string,
): { label: string; score: number } | undefined {
  const vocab = new Set(model.vocabulary)
  const ts = tokens(text).filter((t) => vocab.has(t))
  const labels = Object.entries(model.labels)
  if (!ts.length || model.samples < 10 || labels.length < 2 || labels.some(([, r]) => r.count < 3))
    return
  const ranked = labels
    .map(([label, row]) => ({
      label,
      log:
        Math.log(row.count / model.samples) +
        ts.reduce(
          (n, t) =>
            n +
            Math.log(
              ((Object.hasOwn(row.words, t) ? row.words[t] : 0) + 1) / (row.total + vocab.size),
            ),
          0,
        ),
    }))
    .sort((a, b) => b.log - a.log)
  const score = 1 / ranked.reduce((n, r) => n + Math.exp(r.log - ranked[0].log), 0)
  // Internal score is NOT a calibrated probability; never present it as accuracy.
  return score >= 0.8 ? { label: ranked[0].label, score } : undefined
}
export function learnNoteModel(
  records: MaintenanceRecord[],
  items: MaintenanceItem[],
  excludeId?: string,
): NoteModel {
  const ids = new Set(items.map((i) => i.id))
  const model = emptyNoteModel()
  const seen = new Set<string>()
  const rows = records
    .filter(
      (r) =>
        r.id !== excludeId &&
        r.notes &&
        r.items_maintained.length === 1 &&
        ids.has(r.items_maintained[0]),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2000)
  for (const r of rows) {
    const key = `${r.user_vehicle_id}|${r.date}|${r.km_at_maintenance}|${normalizeText(r.notes!)}`
    if (seen.has(key)) continue
    seen.add(key)
    trainNote(model, r.notes!, r.items_maintained[0])
  }
  return model
}
export function suggestNote(
  text: string,
  items: MaintenanceItem[],
  model: NoteModel,
): { ids: string[]; explanation: string } {
  const normalized = normalizeText(text)
  if (!normalized) return { ids: [], explanation: 'Nhập mô tả ngắn, ví dụ: đã thay nhớt máy.' }
  if (/\b(chua|khong|dinh|se|can|nen|kiem tra xem)\b/.test(normalized))
    return {
      ids: [],
      explanation:
        'Nội dung có thể là việc chưa làm hoặc dự định. Hãy tự chọn hạng mục đã thực hiện.',
    }
  const rules = [
    {
      pattern: /\b(thay|doi)\s+(nhot may|nhot dong co|dau dong co|nhot)\b/,
      name: 'thay dau dong co',
      exclude: /\b(nhot lap|dau phanh|hop so)\b/,
    },
    { pattern: /\b(kiem tra|kt)\s+(phanh|thang)\b/, name: 'kiem tra phanh' },
    { pattern: /\b(kiem tra|kt)\s+(lop|vo xe)\b/, name: 'kiem tra lop' },
    { pattern: /\b(kiem tra|kt)\s+loc gio\b/, name: 'kiem tra loc gio' },
    { pattern: /\bthay\s+loc gio\b/, name: 'thay loc gio' },
  ]
  const ids = items
    .filter((item) =>
      rules.some(
        (rule) =>
          rule.pattern.test(normalized) &&
          !rule.exclude?.test(normalized) &&
          normalizeText(item.name).startsWith(rule.name),
      ),
    )
    .map((i) => i.id)
  if (ids.length)
    return { ids, explanation: 'Nhận dạng theo từ khóa. Kiểm tra và bấm áp dụng nếu đúng.' }
  const learned = classifyNote(model, text)
  if (learned && items.some((i) => i.id === learned.label))
    return {
      ids: [learned.label],
      explanation: `Gợi ý học từ ${model.samples} ghi chú đã lưu của bạn; cần xác nhận trước khi áp dụng.`,
    }
  return {
    ids: [],
    explanation:
      'Chưa hiểu chắc nội dung này. Chọn hạng mục bên dưới; ghi chú đã xác nhận sẽ giúp hệ thống học dần.',
  }
}
