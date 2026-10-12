'use client'
import { useState } from 'react'
import { useData } from './DataProvider'
import { createClient } from '@/lib/supabase/client'
import { Page, Field, ErrorMessage, message } from './UI'
type Table = 'vehicles' | 'maintenance_items' | 'parts_suggestions' | 'honda_stores'
type Row = Record<string, unknown>
type Definition = {
  key: string
  label: string
  type?: 'number' | 'checkbox' | 'url'
  required?: boolean
  options?: { value: string; label: string }[]
}
export default function CatalogAdmin({ initial = 'vehicles' }: { initial?: Table }) {
  const { data, refresh } = useData()
  const [table, setTable] = useState<Table>(initial)
  const [editing, setEditing] = useState<Row | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const tables: { id: Table; label: string }[] = [
    { id: 'vehicles', label: 'Mẫu xe' },
    { id: 'maintenance_items', label: 'Hạng mục & chu kỳ' },
    { id: 'parts_suggestions', label: 'Phụ tùng' },
    { id: 'honda_stores', label: 'Cửa hàng' },
  ]
  const vehicleOptions = data.vehicles.map((v) => ({
    value: v.id,
    label: v.name + ' · ' + v.model,
  }))
  const vehicleField: Definition = {
    key: 'vehicle_id',
    label: 'Mẫu xe',
    required: true,
    options: vehicleOptions,
  }
  const definitions: Record<Table, Definition[]> = {
    vehicles: [
      { key: 'name', label: 'Tên xe', required: true },
      { key: 'model', label: 'Mẫu / đời xe', required: true },
      { key: 'brand', label: 'Hãng', required: true },
      {
        key: 'type',
        label: 'Loại',
        options: [
          { value: 'scooter', label: 'Xe tay ga' },
          { value: 'semi-auto', label: 'Xe số' },
        ],
        required: true,
      },
      { key: 'engine_cc', label: 'Dung tích động cơ (cc)', type: 'number', required: true },
      { key: 'oil_capacity_liters', label: 'Dung tích dầu (lít)', type: 'number', required: true },
      { key: 'description', label: 'Mô tả' },
      { key: 'is_active', label: 'Cho phép thêm xe mới', type: 'checkbox' },
    ],
    maintenance_items: [
      vehicleField,
      { key: 'name', label: 'Tên hạng mục', required: true },
      { key: 'description', label: 'Hướng dẫn / phạm vi đời xe' },
      { key: 'interval_km', label: 'Chu kỳ km', type: 'number', required: true },
      { key: 'interval_months', label: 'Chu kỳ tháng', type: 'number', required: true },
      { key: 'odometer_based', label: 'Mốc km tích lũy theo công-tơ-mét', type: 'checkbox' },
      {
        key: 'first_service_km',
        label: 'Mốc chạy rà đầu tiên (km, có thể để trống)',
        type: 'number',
      },
      { key: 'estimated_cost_min', label: 'Giá thấp nhất (đ)', type: 'number', required: true },
      { key: 'estimated_cost_max', label: 'Giá cao nhất (đ)', type: 'number', required: true },
      {
        key: 'category',
        label: 'Nhóm',
        required: true,
        options: ['engine', 'brake', 'filter', 'electrical', 'tires', 'body', 'other'].map(
          (value) => ({ value, label: value }),
        ),
      },
      { key: 'is_critical', label: 'Hạng mục quan trọng', type: 'checkbox' },
      { key: 'source_url', label: 'Nguồn tài liệu HTTPS', type: 'url' },
      { key: 'verified', label: 'Đã đối chiếu đúng mẫu/đời xe', type: 'checkbox' },
    ],
    parts_suggestions: [
      vehicleField,
      {
        key: 'maintenance_item_id',
        label: 'Hạng mục tương ứng',
        required: true,
        options: data.items.map((i) => ({
          value: i.id,
          label: (data.vehicles.find((v) => v.id === i.vehicle_id)?.name || '') + ' · ' + i.name,
        })),
      },
      { key: 'part_name', label: 'Tên phụ tùng', required: true },
      { key: 'part_number', label: 'Mã phụ tùng' },
      { key: 'brand', label: 'Hãng' },
      { key: 'estimated_price_min', label: 'Giá thấp nhất (đ)', type: 'number', required: true },
      { key: 'estimated_price_max', label: 'Giá cao nhất (đ)', type: 'number', required: true },
      { key: 'replace_interval_km', label: 'Chu kỳ km', type: 'number', required: true },
      { key: 'replace_interval_months', label: 'Chu kỳ tháng', type: 'number' },
      { key: 'notes', label: 'Ghi chú tương thích' },
    ],
    honda_stores: [
      { key: 'name', label: 'Tên cửa hàng', required: true },
      { key: 'address', label: 'Địa chỉ', required: true },
      { key: 'city', label: 'Thành phố', required: true },
      { key: 'district', label: 'Khu vực' },
      { key: 'phone', label: 'Điện thoại' },
      { key: 'lat', label: 'Vĩ độ', type: 'number', required: true },
      { key: 'lng', label: 'Kinh độ', type: 'number', required: true },
      { key: 'opening_hours', label: 'Giờ mở cửa' },
      { key: 'is_active', label: 'Hiển thị cửa hàng', type: 'checkbox' },
    ],
  }
  const source = {
    vehicles: data.vehicles,
    maintenance_items: data.items,
    parts_suggestions: data.parts,
    honda_stores: data.stores,
  }[table] as unknown as Row[]
  return (
    <Page
      title="Quản trị danh mục"
      description="Quản lý dữ liệu dùng chung. Chỉ đánh dấu xác minh khi đã kiểm tra đúng tài liệu và đời xe."
    >
      <div className="toolbar">
        {tables.map((t) => (
          <button
            className={`btn ${table === t.id ? 'btn-primary' : 'btn-outline'}`}
            key={t.id}
            onClick={() => {
              setTable(t.id)
              setEditing(null)
              setError('')
              setNotice('')
            }}
          >
            {t.label}
          </button>
        ))}
        <button className="btn btn-outline" onClick={() => setEditing({ is_active: true })}>
          + Thêm mới
        </button>
      </div>
      <ErrorMessage error={error} />
      {notice && (
        <p className="notice success" role="status">
          {notice}
        </p>
      )}
      {editing && (
        <form
          key={table + String(editing.id)}
          className="card panel form-stack"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError('')
            setNotice('')
            const f = new FormData(e.currentTarget)
            const row: Row = {}
            for (const field of definitions[table])
              row[field.key] =
                field.type === 'checkbox'
                  ? f.has(field.key)
                  : field.type === 'number'
                    ? f.get(field.key) === ''
                      ? null
                      : Number(f.get(field.key))
                    : String(f.get(field.key) || '').trim()
            try {
              if (
                table === 'honda_stores' &&
                (Number(row.lat) < -90 ||
                  Number(row.lat) > 90 ||
                  Number(row.lng) < -180 ||
                  Number(row.lng) > 180)
              )
                throw new Error('Tọa độ không hợp lệ.')
              if (
                table === 'vehicles' &&
                (Number(row.engine_cc) <= 0 || Number(row.oil_capacity_liters) <= 0)
              )
                throw new Error('Thông số động cơ phải lớn hơn 0.')
              if (
                table === 'maintenance_items' &&
                row.verified &&
                !String(row.source_url).startsWith('https://')
              )
                throw new Error('Cần nguồn HTTPS trước khi xác minh.')
              const client = createClient()
              const result = editing.id
                ? await client.from(table).update(row).eq('id', String(editing.id))
                : await client.from(table).insert(row)
              if (result.error) throw new Error(result.error.message)
              await refresh()
              setEditing(null)
              setNotice('Đã lưu danh mục.')
            } catch (e) {
              setError(message(e))
            } finally {
              setBusy(false)
            }
          }}
        >
          <h2>{editing.id ? 'Chỉnh sửa' : 'Thêm mới'}</h2>
          <div className="form-grid">
            {definitions[table].map((field) => (
              <Field key={field.key} label={field.label + (field.required ? ' *' : '')}>
                {field.options ? (
                  <select
                    className="input"
                    name={field.key}
                    required={field.required}
                    defaultValue={String(editing[field.key] || '')}
                  >
                    <option value="">Chọn…</option>
                    {field.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    name={field.key}
                    defaultChecked={Boolean(editing[field.key])}
                  />
                ) : (
                  <input
                    className="input"
                    name={field.key}
                    type={field.type || 'text'}
                    step={field.type === 'number' ? 'any' : undefined}
                    required={field.required}
                    maxLength={2000}
                    defaultValue={String(editing[field.key] ?? '')}
                  />
                )}
              </Field>
            ))}
          </div>
          <div className="actions">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Đang lưu…' : 'Lưu'}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setEditing(null)}>
              Hủy
            </button>
          </div>
        </form>
      )}
      <div className="card panel">
        {source.map((row) => (
          <div className="list-row" key={String(row.id)}>
            <div>
              <strong>{String(row.name || row.part_name)}</strong>
              <p className="small muted">
                {String(row.model || row.address || row.description || row.notes || '')}
                {row.is_active === false ? ' · Đã ẩn' : ''}
              </p>
            </div>
            <div className="actions">
              <button className="btn btn-outline btn-sm" onClick={() => setEditing(row)}>
                Sửa
              </button>
              {table !== 'vehicles' && (
                <button
                  disabled={busy}
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    if (!confirm('Xóa mục này? Hạng mục đã dùng trong lịch sử sẽ được giữ lại.'))
                      return
                    setBusy(true)
                    setError('')
                    try {
                      const { error } = await createClient()
                        .from(table)
                        .delete()
                        .eq('id', String(row.id))
                      if (error) throw new Error(error.message)
                      await refresh()
                    } catch (e) {
                      setError(message(e))
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Xóa
                </button>
              )}
            </div>
          </div>
        ))}
        {!source.length && <p className="muted">Chưa có dữ liệu. Chọn “Thêm mới” để bắt đầu.</p>}
      </div>
    </Page>
  )
}
