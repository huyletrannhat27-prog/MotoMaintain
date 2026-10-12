'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useData } from '@/components/DataProvider'
import { Page, VehicleFilter, ErrorMessage, message } from '@/components/UI'
import { dateLabel, money, km, vehicleLabel } from '@/lib/maintenance'
function HistoryContent() {
  const { data, deleteRecord } = useData()
  const params = useSearchParams()
  const [vehicle, setVehicle] = useState(params.get('vehicle') || '')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState('')
  const records = data.records
    .filter(
      (r) =>
        (!vehicle || r.user_vehicle_id === vehicle) &&
        (!from || r.date >= from) &&
        (!to || r.date <= to) &&
        [
          r.shop_name,
          r.notes,
          ...r.items_maintained.map((id) => data.items.find((i) => i.id === id)?.name),
        ]
          .join(' ')
          .toLocaleLowerCase('vi')
          .includes(search.toLocaleLowerCase('vi')),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.km_at_maintenance - a.km_at_maintenance)
  return (
    <Page
      title="Lịch sử bảo dưỡng"
      description="Mọi lần chăm sóc xe, được lưu lại rõ ràng."
      action={
        <Link href="/input" className="btn btn-primary">
          + Ghi nhận mới
        </Link>
      }
    >
      <ErrorMessage error={error} />
      <div className="toolbar">
        <VehicleFilter value={vehicle} onChange={setVehicle} />
        <label className="input-group">
          Tìm kiếm
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hạng mục, cửa hàng, ghi chú"
          />
        </label>
        <label className="input-group">
          Từ ngày
          <input
            type="date"
            className="input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="input-group">
          Đến ngày
          <input
            type="date"
            min={from}
            className="input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      <p className="muted result-count">
        {records.length} bản ghi · Tổng chi phí{' '}
        {money(records.reduce((s, r) => s + (r.cost || 0), 0))}
      </p>
      <div className="form-stack">
        {records.map((r) => {
          const v = data.userVehicles.find((v) => v.id === r.user_vehicle_id)
          return (
            <article key={r.id} className="card panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{v ? vehicleLabel(v, data) : 'Xe đã lưu'}</p>
                  <h2>{dateLabel(r.date)}</h2>
                  <p className="muted">
                    {km(r.km_at_maintenance)} · {r.shop_name || 'Chưa ghi cửa hàng'}
                  </p>
                </div>
                <strong>{r.cost != null ? money(r.cost) : 'Chưa ghi chi phí'}</strong>
              </div>
              <div className="chips">
                {r.items_maintained.map((id) => (
                  <span key={id} className="chip">
                    {data.items.find((i) => i.id === id)?.name || 'Hạng mục đã lưu'}
                  </span>
                ))}
              </div>
              {r.notes && <p className="record-notes">{r.notes}</p>}
              <div className="actions">
                <Link href={`/input?edit=${r.id}`} className="btn btn-outline btn-sm">
                  Sửa bản ghi
                </Link>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={!!deleting}
                  onClick={async () => {
                    if (
                      !confirm(
                        'Xóa bản ghi này? Gợi ý bảo dưỡng sẽ được tính lại từ lịch sử còn lại.',
                      )
                    )
                      return
                    setError('')
                    setDeleting(r.id)
                    try {
                      await deleteRecord(r.id)
                    } catch (e) {
                      setError(message(e))
                    } finally {
                      setDeleting('')
                    }
                  }}
                >
                  {deleting === r.id ? 'Đang xóa…' : 'Xóa'}
                </button>
              </div>
            </article>
          )
        })}
        {!records.length && (
          <div className="card empty-state">
            <h2>Chưa có bản ghi phù hợp</h2>
            <p className="muted">Thử đổi bộ lọc hoặc ghi nhận lần bảo dưỡng đầu tiên.</p>
          </div>
        )}
      </div>
    </Page>
  )
}
export default function HistoryPage() {
  return (
    <Suspense fallback={<p>Đang tải…</p>}>
      <HistoryContent />
    </Suspense>
  )
}
