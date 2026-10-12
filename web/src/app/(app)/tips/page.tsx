'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useData } from '@/components/DataProvider'
import { Page, Empty, VehicleFilter, Status } from '@/components/UI'
import {
  recommendations,
  dateLabel,
  km,
  money,
  statusLabels,
  vehicleLabel,
  type Urgency,
} from '@/lib/maintenance'
function TipsContent() {
  const { data } = useData()
  const params = useSearchParams()
  const [vehicle, setVehicle] = useState(params.get('vehicle') || data.userVehicles[0]?.id || '')
  const [status, setStatus] = useState('')
  const [limit, setLimit] = useState(12)
  const all = recommendations(data).filter((r) => !vehicle || r.vehicle.id === vehicle)
  const tips = all.filter((r) => !status || r.urgency === status)
  return (
    <Page
      title="Gợi ý bảo dưỡng"
      description="Theo dõi từng hạng mục của từng xe, dựa trên lần thực hiện gần nhất."
    >
      <div className="toolbar">
        <VehicleFilter
          value={vehicle}
          all={false}
          onChange={(id) => {
            setVehicle(id)
            setLimit(12)
          }}
        />
        {vehicle && (
          <Link className="btn btn-primary" href={`/input?vehicle=${vehicle}`}>
            + Ghi nhận bảo dưỡng cho xe này
          </Link>
        )}
        <label className="input-group">
          Tình trạng
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="status-grid">
        {Object.entries(statusLabels).map(([s, label]) => (
          <button
            key={s}
            className={`card status-counter ${status === s ? 'active' : ''}`}
            onClick={() => setStatus(status === s ? '' : s)}
          >
            <strong>{all.filter((r) => r.urgency === s).length}</strong>
            <Status value={s as Urgency} />
            <span className="sr-only">{label}</span>
          </button>
        ))}
      </div>
      {!data.userVehicles.length ? (
        <Empty text="Chưa có xe để gợi ý" />
      ) : !tips.length ? (
        <div className="card empty-state">
          <h2>Không có hạng mục trong bộ lọc này</h2>
          <p className="muted">
            {all.length
              ? 'Thử chọn trạng thái khác.'
              : 'Danh mục bảo dưỡng của xe cần được bổ sung.'}
          </p>
        </div>
      ) : (
        <div className="tips-grid">
          {tips.slice(0, limit).map((t) => (
            <article key={t.vehicle.id + t.item.id} className="card tip-card">
              <div className="section-heading">
                <p className="eyebrow">{vehicleLabel(t.vehicle, data)}</p>
                <Status value={t.urgency} />
              </div>
              <h2>{t.item.name}</h2>
              <p className="muted">{t.reason}</p>
              <div className="next-milestone">
                <strong>
                  {t.nextKm != null
                    ? km(t.nextKm)
                    : t.nextDate
                      ? dateLabel(t.nextDate)
                      : 'Bổ sung lịch sử để bắt đầu'}
                </strong>
                {t.nextKm != null && t.nextDate && (
                  <span>hoặc {dateLabel(t.nextDate)}, mốc nào đến trước</span>
                )}
              </div>
              <details className="tip-details">
                <summary>Vì sao có gợi ý này? Xem nguồn và dự báo</summary>
                {!t.item.verified && (
                  <p className="notice small">
                    Chu kỳ tham khảo, chưa được xác minh cho đúng đời xe. Đối chiếu sách hướng dẫn
                    trước khi áp dụng.
                  </p>
                )}
                <div
                  className="progress-track"
                  aria-label="Tiến độ chu kỳ"
                  role="progressbar"
                  aria-valuenow={t.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span className={`progress-${t.urgency}`} style={{ width: `${t.progress}%` }} />
                </div>
                <p className="small muted">Tiến độ chu kỳ, không phải mức hao mòn đo thực tế.</p>
                <dl className="detail-grid">
                  <div>
                    <dt>Lần gần nhất</dt>
                    <dd>{dateLabel(t.lastRecord?.date)}</dd>
                  </div>
                  <div>
                    <dt>Mốc tiếp theo</dt>
                    <dd>{t.nextKm != null ? km(t.nextKm) : 'Không có mốc km'}</dd>
                  </div>
                  <div>
                    <dt>Hạn theo thời gian</dt>
                    <dd>{dateLabel(t.nextDate)}</dd>
                  </div>
                  <div>
                    <dt>Chi phí tham khảo</dt>
                    <dd>
                      {t.item.estimated_cost_max
                        ? money(t.item.estimated_cost_min) +
                          ' – ' +
                          money(t.item.estimated_cost_max)
                        : 'Chưa có báo giá'}
                    </dd>
                  </div>
                </dl>
                <div className="assistant-note">
                  <strong>Dự báo từ lịch sử của xe</strong>
                  <p>
                    {t.predictedDate
                      ? `Khoảng ${dateLabel(t.predictedDate)} đạt mốc km nếu giữ mức ${t.riding?.kmPerDay} km/ngày. Đây là ước tính từ lần ghi nhận ${dateLabel(t.riding?.lastDate)}, không thay thế hạn bảo dưỡng.`
                      : t.riding?.reason || 'Bổ sung lịch sử để hệ thống học mức sử dụng.'}
                  </p>
                </div>
                {data.parts
                  .filter((p) => p.maintenance_item_id === t.item.id)
                  .map((p) => (
                    <div className="part-note" key={p.id}>
                      <strong>{p.part_name}</strong>
                      <p className="small muted">
                        {p.part_number && `Mã: ${p.part_number} · `}
                        {p.notes}
                      </p>
                      <span className="small">
                        {money(p.estimated_price_min)} – {money(p.estimated_price_max)}
                      </span>
                    </div>
                  ))}
                {t.item.source_url?.startsWith('https://') && (
                  <a href={t.item.source_url} target="_blank" rel="noreferrer">
                    Đọc bảng bảo dưỡng gốc ↗
                  </a>
                )}
              </details>
              <div className="actions">
                <Link
                  className="btn btn-primary btn-sm"
                  href={`/input?vehicle=${t.vehicle.id}&item=${t.item.id}`}
                >
                  {t.urgency === 'unknown' ? 'Bổ sung lịch sử' : 'Ghi nhận đã thực hiện'}
                </Link>
                <Link href="/stores" className="btn btn-outline btn-sm">
                  Tìm cửa hàng
                </Link>
                {t.item.source_url && /^https?:\/\//.test(t.item.source_url) && (
                  <a href={t.item.source_url} target="_blank" rel="noreferrer" className="small">
                    Nguồn chu kỳ ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {tips.length > limit && (
        <button className="btn btn-outline" onClick={() => setLimit((n) => n + 12)}>
          Xem thêm {Math.min(12, tips.length - limit)} hạng mục
        </button>
      )}
    </Page>
  )
}
export default function TipsPage() {
  return (
    <Suspense fallback={<p>Đang tải…</p>}>
      <TipsContent />
    </Suspense>
  )
}
