'use client'
import { useState } from 'react'
import { useData } from './DataProvider'
import { ErrorMessage, Field, message } from './UI'
import type { UserVehicle } from '@/lib/types'
import { todayISO } from '@/lib/maintenance'
import { matchesModel, vehicleGroups } from '../../../shared/catalog'
export default function VehicleForm({
  vehicle,
  onDone,
}: {
  vehicle?: UserVehicle
  onDone: () => void
}) {
  const { data, saveVehicle } = useData()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [type, setType] = useState(
    data.vehicles.find((v) => v.id === vehicle?.vehicle_id)?.type || 'scooter',
  )
  const [model, setModel] = useState(vehicle?.vehicle_id || '')
  const [search, setSearch] = useState('')
  const locked = vehicle && data.records.some((r) => r.user_vehicle_id === vehicle.id)
  return (
    <form
      className="card panel form-stack"
      onSubmit={async (e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        setSaving(true)
        setError('')
        try {
          await saveVehicle(
            {
              vehicle_id: locked ? vehicle.vehicle_id : String(f.get('model')),
              nickname: String(f.get('nickname')).trim(),
              license_plate: String(f.get('plate')).trim(),
              current_km: Number(f.get('km')),
              year: f.get('year') ? Number(f.get('year')) : undefined,
              purchase_date: String(f.get('date')) || undefined,
              color: String(f.get('color')).trim(),
            },
            vehicle?.id,
          )
          onDone()
        } catch (e) {
          setError(message(e))
        } finally {
          setSaving(false)
        }
      }}
    >
      <h2>{vehicle ? 'Cập nhật xe' : 'Thêm xe mới'}</h2>
      <ErrorMessage error={error} />
      <fieldset className="choice-section">
        <legend>1. Xe của bạn thuộc loại nào?</legend>
        <div className="type-choices">
          {vehicleGroups.map((group) => (
            <button
              type="button"
              key={group.type}
              disabled={!!locked}
              aria-pressed={type === group.type}
              className={`type-choice ${type === group.type ? 'active' : ''}`}
              onClick={() => {
                setType(group.type)
                setModel('')
                setSearch('')
              }}
            >
              <strong>{group.label}</strong>
              <span>{group.examples}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <h3>2. Chọn đúng mẫu xe</h3>
      <Field label="Tìm mẫu xe">
        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Gõ AB, SH, Wave…"
          disabled={!!locked}
        />
      </Field>
      <div className="form-grid">
        <Field label="Mẫu xe *">
          <select
            required
            name="model"
            className="input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!!locked}
          >
            <option value="">Chọn mẫu xe</option>
            {data.vehicles
              .filter(
                (v) =>
                  v.id === model ||
                  (v.is_active !== false &&
                    v.type === type &&
                    matchesModel(`${v.name} ${v.model}`, search)),
              )
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.model}
                </option>
              ))}
          </select>
        </Field>
        <p className="muted small">
          Đối chiếu mã/đời xe trong sách đi kèm. Mẫu minh họa có chu kỳ chưa xác minh; mẫu có mã tài
          liệu dùng lịch Honda đã đối chiếu.
        </p>
      </div>
      <h3>3. Nhập thông tin xe của bạn</h3>
      <div className="form-grid">
        <Field label="Tên gọi của xe">
          <input
            name="nickname"
            maxLength={80}
            className="input"
            defaultValue={vehicle?.nickname}
            placeholder="Ví dụ: Vision đi làm"
          />
        </Field>
        <Field label="Biển số">
          <input
            name="plate"
            maxLength={20}
            className="input"
            defaultValue={vehicle?.license_plate}
          />
        </Field>
        <Field label="Số km hiện tại *">
          <input
            required
            type="number"
            name="km"
            min={0}
            max={2147483647}
            step={1}
            className="input"
            defaultValue={vehicle?.current_km ?? 0}
          />
        </Field>
        <Field label="Năm sản xuất">
          <input
            type="number"
            name="year"
            min={1950}
            max={Number(todayISO().slice(0, 4)) + 1}
            className="input"
            defaultValue={vehicle?.year}
          />
        </Field>
        <Field label="Ngày mua">
          <input
            type="date"
            name="date"
            max={todayISO()}
            className="input"
            defaultValue={vehicle?.purchase_date}
          />
        </Field>
        <Field label="Màu xe">
          <input name="color" maxLength={40} className="input" defaultValue={vehicle?.color} />
        </Field>
      </div>
      <div className="actions">
        <button disabled={saving} className="btn btn-primary">
          {saving ? 'Đang lưu…' : 'Lưu xe'}
        </button>
        <button type="button" onClick={onDone} className="btn btn-outline">
          Hủy
        </button>
      </div>
    </form>
  )
}
