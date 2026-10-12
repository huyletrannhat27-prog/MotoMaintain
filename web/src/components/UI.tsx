'use client'
import Link from 'next/link'
import { useData } from './DataProvider'
import { statusLabels, vehicleLabel, type Urgency } from '@/lib/maintenance'
import { groupOwnedVehicles } from '../../../shared/catalog'
export function Page({
  title,
  description,
  children,
  action,
}: {
  title: string
  description: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">MOTOMAINTAIN / CHĂM SÓC XE</p>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
        {action}
      </header>
      {children}
    </div>
  )
}
export function Empty({
  text,
  href = '/vehicles',
  label = 'Thêm xe của bạn',
}: {
  text: string
  href?: string
  label?: string
}) {
  return (
    <div className="card empty-state">
      <span className="empty-symbol">◇</span>
      <h2>{text}</h2>
      <p className="muted">Bắt đầu với thông tin xe và lần bảo dưỡng gần nhất.</p>
      <Link href={href} className="btn btn-primary">
        {label}
      </Link>
    </div>
  )
}
export function VehicleFilter({
  value,
  onChange,
  all = true,
}: {
  value: string
  onChange: (id: string) => void
  all?: boolean
}) {
  const { data } = useData()
  return (
    <label className="input-group">
      Xe của bạn
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{all ? 'Tất cả xe' : 'Chọn xe'}</option>
        {groupOwnedVehicles(data).map((group) => (
          <optgroup key={group.type} label={group.label}>
            {group.vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {vehicleLabel(v, data)} · {v.license_plate || 'Chưa có biển số'}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}
export function Status({ value }: { value: Urgency }) {
  return <span className={`status status-${value}`}>{statusLabels[value]}</span>
}
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="input-group">
      <span>{label}</span>
      {children}
    </label>
  )
}
export function ErrorMessage({ error }: { error: string }) {
  return error ? (
    <p role="alert" className="notice error">
      {error}
    </p>
  ) : null
}
export function message(error: unknown) {
  return error instanceof Error ? error.message : 'Thao tác chưa thành công. Vui lòng thử lại.'
}
