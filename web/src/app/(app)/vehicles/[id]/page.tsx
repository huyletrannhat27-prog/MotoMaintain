'use client'
import { use } from 'react'
import Link from 'next/link'
import { useData } from '@/components/DataProvider'
import { Page, Empty, Status } from '@/components/UI'
import { dateLabel, km, money, recommendations, vehicleLabel } from '@/lib/maintenance'
export default function VehicleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data } = useData()
  const vehicle = data.userVehicles.find((v) => v.id === id)
  if (!vehicle) return <Empty text="Không tìm thấy xe" label="Về danh sách xe" />
  const records = data.records
    .filter((r) => r.user_vehicle_id === id)
    .sort((a, b) => b.date.localeCompare(a.date))
  return (
    <Page
      title={vehicleLabel(vehicle, data)}
      description={`${vehicle.license_plate || 'Chưa có biển số'} · ${km(vehicle.current_km)}`}
      action={
        <Link href={`/input?vehicle=${id}`} className="btn btn-primary">
          Ghi nhận bảo dưỡng
        </Link>
      }
    >
      <div className="stat-grid">
        <div className="card metric">
          <p className="muted">Lần bảo dưỡng</p>
          <strong>{records.length}</strong>
        </div>
        <div className="card metric">
          <p className="muted">Tổng chi phí</p>
          <strong>{money(records.reduce((s, r) => s + (r.cost || 0), 0))}</strong>
        </div>
        <div className="card metric">
          <p className="muted">Ngày mua</p>
          <strong>{dateLabel(vehicle.purchase_date)}</strong>
        </div>
      </div>
      <div className="section-heading">
        <h2>Tình trạng từng hạng mục</h2>
        <Link href={`/tips?vehicle=${id}`}>Xem gợi ý chi tiết ↗</Link>
      </div>
      <div className="card panel">
        {recommendations(data)
          .filter((t) => t.vehicle.id === id)
          .map((t) => (
            <div key={t.item.id} className="list-row">
              <div>
                <h3>{t.item.name}</h3>
                <p className="muted small">{t.reason}</p>
              </div>
              <Status value={t.urgency} />
            </div>
          ))}
      </div>
      <div className="section-heading">
        <h2>Lịch sử của xe</h2>
        <Link href={`/history?vehicle=${id}`}>Mở lịch sử ↗</Link>
      </div>
      <div className="card panel">
        {records.map((r) => (
          <div key={r.id} className="list-row">
            <div>
              <strong>
                {dateLabel(r.date)} · {km(r.km_at_maintenance)}
              </strong>
              <p className="muted">
                {r.items_maintained
                  .map((id) => data.items.find((i) => i.id === id)?.name)
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
            <span>{r.cost != null ? money(r.cost) : 'Chưa ghi chi phí'}</span>
          </div>
        ))}
        {!records.length && <p className="muted">Chưa ghi nhận bảo dưỡng.</p>}
      </div>
    </Page>
  )
}
