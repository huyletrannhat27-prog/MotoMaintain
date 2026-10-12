import type { AppData, MaintenanceItem, Vehicle } from './types'

// Facts transcribed from visually checked tables, not a copy of the manuals.
// Existing generic models are intentionally not relabelled as verified models.
export const manualSources = [
  {
    id: 'ab-2025',
    title: 'Air Blade 125/160 · tài liệu mẫu 2025',
    scope: 'ACA125CBF / ACA160CAF, thị trường Việt Nam',
    pages: '71–72',
    url: 'https://2rom-prd-data.hondamotopub.com/om/HVN/Air%20Blade%20125/2025/AB_2025.pdf',
    catalog: 'https://www.hondamotopub.com/model/HVN/K2Z251',
    checked: '2026-10-10',
  },
  {
    id: 'wave-2025',
    title: 'Wave Alpha · tài liệu mẫu 2025',
    scope: 'Wave Alpha, tài liệu 4FK89A30',
    pages: '39–40',
    url: 'https://2rom-prd-data.hondamotopub.com/om/HVN/Wave%20Alpha/2025/Wave%20Alpha_4FK89A30_0.pdf',
    catalog: 'https://www.hondamotopub.com/om/HVN/Wave%20Alpha/2025',
    checked: '2026-10-10',
  },
  {
    id: 'sh-2025',
    title: 'SH125i/160i · tài liệu 11/2025',
    scope: 'SH125D/AD, SH160D/AD, thị trường Việt Nam',
    pages: '117–118',
    url: 'https://cdn.honda.com.vn/motorbike-manual/November2025/UG9NBoEDyF0DHrjoTphA.pdf',
    catalog: 'https://www.honda.com.vn/xe-may/dich-vu-sau-ban-hang/huong-dan-su-dung',
    checked: '2026-10-10',
  },
]
export function officialCatalog(
  stamp = '2026-10-10T00:00:00.000Z',
): Pick<AppData, 'vehicles' | 'items'> {
  const definitions = [
    ['ab125-2025', 'Honda Air Blade 125', 'ACA125CBF · mẫu 2025', 'scooter', 125, 'ab-2025'],
    ['ab160-2025', 'Honda Air Blade 160', 'ACA160CAF · mẫu 2025', 'scooter', 160, 'ab-2025'],
    ['wave-2025', 'Honda Wave Alpha 2025', 'Wave Alpha · 4FK89A30', 'semi-auto', 110, 'wave-2025'],
    ['sh125-2025', 'Honda SH125i', 'SH125D/AD · tài liệu 11/2025', 'scooter', 125, 'sh-2025'],
    ['sh160-2025', 'Honda SH160i', 'SH160D/AD · tài liệu 11/2025', 'scooter', 160, 'sh-2025'],
  ] as const
  const vehicles: Vehicle[] = []
  const items: MaintenanceItem[] = []
  for (const [id, name, model, type, cc, sourceId] of definitions) {
    const source = manualSources.find((s) => s.id === sourceId)!
    vehicles.push({
      id,
      name,
      model,
      type,
      brand: 'Honda',
      engine_cc: cc,
      oil_capacity_liters: 0.8,
      description: `Đối chiếu mã xe với sách đi kèm trước khi chọn. ${source.scope}. Dung tích động cơ ghi theo tên thương mại.`,
      is_active: true,
      created_at: stamp,
      updated_at: stamp,
    })
    const base = [
      {
        key: 'oil',
        name: 'Thay dầu động cơ',
        category: 'engine',
        interval_km: 6000,
        interval_months: 12,
        first_service_km: 1000,
        odometer_based: true,
      },
      {
        key: 'brake',
        name: 'Kiểm tra phanh',
        category: 'brake',
        interval_km: 6000,
        interval_months: 12,
        first_service_km: 1000,
        odometer_based: true,
      },
      {
        key: 'tires',
        name: 'Kiểm tra lốp xe',
        category: 'tires',
        interval_km: 6000,
        interval_months: 12,
        odometer_based: true,
      },
      {
        key: 'filter',
        name: 'Thay lọc gió',
        category: 'filter',
        interval_km: 18000,
        interval_months: 0,
        odometer_based: true,
      },
      ...(type === 'scooter'
        ? [
            {
              key: 'gear-oil',
              name: 'Thay dầu truyền động cuối',
              category: 'engine',
              interval_km: 0,
              interval_months: 24,
              odometer_based: false,
            },
            {
              key: 'brake-fluid',
              name: 'Thay dầu phanh',
              category: 'brake',
              interval_km: 0,
              interval_months: 24,
              odometer_based: false,
            },
            {
              key: 'coolant',
              name: 'Thay dung dịch làm mát',
              category: 'engine',
              interval_km: 0,
              interval_months: 36,
              odometer_based: false,
            },
          ]
        : []),
    ]
    for (const { key, ...rule } of base)
      items.push({
        ...rule,
        category: rule.category as MaintenanceItem['category'],
        id: `${id}-${key}`,
        vehicle_id: id,
        estimated_cost_min: 0,
        estimated_cost_max: 0,
        is_critical: rule.category === 'brake' || rule.category === 'tires',
        verified: true,
        source_url: `${source.url}#page=${sourceId === 'ab-2025' ? 75 : sourceId === 'wave-2025' ? 44 : 121}`,
        description: `Nguồn Honda, trang ${source.pages}; chỉ áp dụng ${source.scope}. Mốc km là số km tích lũy. Bụi/ẩm cần bảo dưỡng thường xuyên hơn; chưa có giá xác minh.`,
        created_at: stamp,
        updated_at: stamp,
      })
  }
  return { vehicles, items }
}
export function upgradeDemoCatalog(data: AppData): AppData {
  const catalog = officialCatalog()
  return {
    ...data,
    vehicles: [
      ...data.vehicles,
      ...catalog.vehicles.filter((v) => !data.vehicles.some((old) => old.id === v.id)),
    ],
    items: [
      ...data.items,
      ...catalog.items.filter((i) => !data.items.some((old) => old.id === i.id)),
    ],
  }
}
export function intervalLabel(item: MaintenanceItem): string {
  const parts = [
    item.interval_km ? `${item.interval_km.toLocaleString('vi-VN')} km` : '',
    item.interval_months ? `${item.interval_months} tháng` : '',
  ].filter(Boolean)
  return parts.join(' / ') + (item.odometer_based ? ' · mốc công-tơ-mét' : '')
}
