'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Bike, Wrench, Wallet, ArrowUpRight, Plus } from 'lucide-react'
import { useData } from '@/components/DataProvider'
import { Page, Empty, Status, VehicleFilter } from '@/components/UI'
import { recommendations, money, dateLabel, km, vehicleLabel } from '@/lib/maintenance'
import CostChart from '@/components/CostChart'
export default function DashboardPage() {
  const { data } = useData()
  const [vehicle, setVehicle] = useState('')
  const [period, setPeriod] = useState('')
  const records = data.records
    .filter(
      (r) => (!vehicle || r.user_vehicle_id === vehicle) && (!period || r.date.startsWith(period)),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
  const tips = recommendations(data).filter((r) => !vehicle || r.vehicle.id === vehicle)
  const due = tips.filter((r) => r.urgency === 'overdue' || r.urgency === 'urgent')
  const months = [...new Set(data.records.map((r) => r.date.slice(0, 7)))].sort().reverse()
  return (
    <Page
      title={`Chào ${data.profile.full_name || 'bạn'} 👋`}
      description="Một chút chăm sóc hôm nay, an tâm hơn trên mọi cung đường."
      action={
        <Link href="/input" className="btn btn-primary">
          <Plus size={17} /> Ghi nhận bảo dưỡng
        </Link>
      }
    >
      <div className="toolbar">
        <VehicleFilter value={vehicle} onChange={setVehicle} />
        <label className="input-group">
          Thống kê chi phí
          <select className="input" value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="">Toàn bộ thời gian</option>
            {months.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="stat-grid">
        {[
          { icon: Bike, label: 'Xe đang theo dõi', value: vehicle ? 1 : data.userVehicles.length },
          { icon: Wrench, label: 'Lần bảo dưỡng', value: records.length },
          {
            icon: Wallet,
            label: 'Chi phí đã ghi nhận',
            value: money(records.reduce((s, r) => s + (r.cost || 0), 0)),
          },
        ].map((s) => (
          <div className="card metric" key={s.label}>
            <s.icon size={23} />
            <p className="muted">{s.label}</p>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
      <CostChart records={records} />
      <div className="section-heading">
        <h2>Cần chú ý hôm nay</h2>
        <Link href="/tips">
          Xem tất cả <ArrowUpRight size={15} />
        </Link>
      </div>
      {!data.userVehicles.length ? (
        <Empty text="Garage của bạn đang trống" />
      ) : (
        <div className="card panel">
          {due.length ? (
            due.slice(0, 5).map((t) => (
              <Link
                className="list-row"
                href={`/tips?vehicle=${t.vehicle.id}`}
                key={t.vehicle.id + t.item.id}
              >
                <div>
                  <p className="muted small">{vehicleLabel(t.vehicle, data)}</p>
                  <h3>{t.item.name}</h3>
                  <p className="small muted">{t.reason}</p>
                </div>
                <Status value={t.urgency} />
              </Link>
            ))
          ) : (
            <p>Chưa có hạng mục đến hạn trong các xe đã có đủ lịch sử.</p>
          )}
          {tips.some((t) => t.urgency === 'unknown') && (
            <p className="notice">
              Một số hạng mục chưa có lịch sử.{' '}
              <Link href="/tips">Bổ sung để nhận gợi ý chính xác hơn →</Link>
            </p>
          )}
        </div>
      )}
      <div className="section-heading">
        <h2>Xe của bạn</h2>
        <Link href="/vehicles">Quản lý xe ↗</Link>
      </div>
      <div className="vehicle-grid">
        {data.userVehicles
          .filter((v) => !vehicle || v.id === vehicle)
          .map((v) => (
            <Link href={`/vehicles/${v.id}`} className="card vehicle-card" key={v.id}>
              <div className="vehicle-art">
                <Bike size={68} strokeWidth={1.1} />
                <span>{data.vehicles.find((x) => x.id === v.vehicle_id)?.brand}</span>
              </div>
              <h3>{vehicleLabel(v, data)}</h3>
              <p className="muted">{v.license_plate || 'Chưa có biển số'}</p>
              <div className="section-heading">
                <strong>{km(v.current_km)}</strong>
                <ArrowUpRight size={20} />
              </div>
            </Link>
          ))}
      </div>
      <div className="section-heading">
        <h2>Hoạt động gần đây</h2>
        <Link href="/history">Lịch sử đầy đủ ↗</Link>
      </div>
      <div className="card panel">
        {records.slice(0, 5).map((r) => (
          <div key={r.id} className="list-row">
            <div>
              <strong>
                {data.userVehicles.find((v) => v.id === r.user_vehicle_id)?.nickname ||
                  'Bảo dưỡng xe'}
              </strong>
              <p className="small muted">
                {dateLabel(r.date)} ·{' '}
                {r.items_maintained
                  .map((id) => data.items.find((i) => i.id === id)?.name || 'Hạng mục đã lưu')
                  .join(', ')}
              </p>
            </div>
            <strong>{r.cost != null ? money(r.cost) : 'Chưa ghi chi phí'}</strong>
          </div>
        ))}
        {!records.length && <p className="muted">Chưa có bản ghi trong bộ lọc này.</p>}
      </div>
    </Page>
  )
}
