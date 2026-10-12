'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useData } from './DataProvider'
import { Field, ErrorMessage, message, VehicleFilter } from './UI'
import { todayISO } from '@/lib/maintenance'
import type { MaintenanceRecord } from '@/lib/types'
import { learnNoteModel, suggestNote } from '../../../shared/learning'
export default function RecordForm({
  record,
  initialVehicle = '',
  initialItem = '',
  onDone,
}: {
  record?: MaintenanceRecord
  initialVehicle?: string
  initialItem?: string
  onDone: () => void
}) {
  const { data, saveRecord } = useData()
  const [vehicle, setVehicle] = useState(record?.user_vehicle_id || initialVehicle)
  const [selected, setSelected] = useState<string[]>(
    record?.items_maintained || (initialItem ? [initialItem] : []),
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState(record?.notes || '')
  const uv = data.userVehicles.find((v) => v.id === vehicle)
  const items = data.items.filter((i) => i.vehicle_id === uv?.vehicle_id)
  const noteModel = useMemo(
    () =>
      learnNoteModel(
        data.records,
        data.items.filter((i) => i.vehicle_id === uv?.vehicle_id),
        record?.id,
      ),
    [data.records, data.items, uv?.vehicle_id, record?.id],
  )
  const suggestion = suggestNote(notes, items, noteModel)
  return (
    <form
      className="card panel form-stack"
      onSubmit={async (e) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        const f = new FormData(e.currentTarget)
        try {
          await saveRecord(
            {
              user_vehicle_id: vehicle,
              date: String(f.get('date')),
              km_at_maintenance: Number(f.get('km')),
              items_maintained: selected,
              cost: f.get('cost') === '' ? undefined : Number(f.get('cost')),
              shop_name: String(f.get('shop')).trim(),
              notes: String(f.get('notes')).trim(),
            },
            record?.id,
          )
          onDone()
        } catch (e) {
          setError(message(e))
        } finally {
          setSaving(false)
        }
      }}
    >
      <ErrorMessage error={error} />
      <h2>1. Chọn xe và thời điểm đã bảo dưỡng</h2>
      {!record && (
        <VehicleFilter
          value={vehicle}
          all={false}
          onChange={(id) => {
            setVehicle(id)
            setSelected([])
          }}
        />
      )}
      <div className="form-grid">
        <Field label="Ngày bảo dưỡng *">
          <input
            required
            type="date"
            name="date"
            className="input"
            max={todayISO()}
            defaultValue={record?.date || todayISO()}
          />
        </Field>
        <Field label="Số km khi bảo dưỡng *">
          <input
            key={vehicle}
            required
            name="km"
            type="number"
            min={0}
            max={2147483647}
            step={1}
            className="input"
            defaultValue={record?.km_at_maintenance ?? uv?.current_km ?? ''}
          />
        </Field>
      </div>
      <h2>2. Bạn đã làm những gì?</h2>
      <Field label="Ghi chú">
        <textarea
          name="notes"
          className="input"
          rows={2}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ví dụ: đã thay nhớt máy và kiểm tra phanh"
        />
      </Field>
      {notes && (
        <div className="assistant-note">
          <p>{suggestion.explanation}</p>
          {suggestion.ids.length > 0 && (
            <>
              <p>
                <strong>
                  {items
                    .filter((i) => suggestion.ids.includes(i.id))
                    .map((i) => i.name)
                    .join(', ')}
                </strong>
              </p>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setSelected((s) => [...new Set([...s, ...suggestion.ids])])}
              >
                Đúng, chọn các hạng mục này
              </button>
            </>
          )}
        </div>
      )}
      <fieldset className="checklist">
        <legend>Hạng mục đã thực hiện *</legend>
        {items.map((i) => (
          <label key={i.id} className={`check-row ${selected.includes(i.id) ? 'selected' : ''}`}>
            <input
              type="checkbox"
              checked={selected.includes(i.id)}
              onChange={(e) =>
                setSelected((s) =>
                  e.target.checked ? [...s, i.id] : s.filter((id) => id !== i.id),
                )
              }
            />
            <span>{i.name}</span>
          </label>
        ))}
        {vehicle && !items.length && (
          <p className="notice">Mẫu xe này chưa có hạng mục. Quản trị viên cần bổ sung danh mục.</p>
        )}
      </fieldset>
      <details className="form-optional">
        <summary>3. Thêm chi phí và cửa hàng (không bắt buộc)</summary>
        <div className="form-grid">
          <Field label="Tổng chi phí (đ)">
            <input
              type="number"
              name="cost"
              min={0}
              max={2147483647}
              step={1}
              className="input"
              defaultValue={record?.cost}
              placeholder="Để trống nếu chưa biết"
            />
          </Field>
          <Field label="Cửa hàng thực hiện">
            <input name="shop" maxLength={150} className="input" defaultValue={record?.shop_name} />
          </Field>
        </div>
      </details>
      <p className="selection-summary">
        Đã chọn {selected.length} hạng mục. Sau khi lưu, mở “Gợi ý bảo dưỡng” để xem mốc mới.
      </p>
      <p className="small muted">
        Chỉ chọn hạng mục thực sự đã làm. Mốc tiếp theo sẽ được tính riêng cho từng hạng mục.
      </p>
      <div className="actions">
        <button disabled={saving || !vehicle || !selected.length} className="btn btn-primary">
          {saving ? 'Đang lưu…' : record ? 'Lưu thay đổi' : 'Lưu bảo dưỡng'}
        </button>
        <Link className="btn btn-outline" href="/history">
          Về lịch sử
        </Link>
      </div>
    </form>
  )
}
