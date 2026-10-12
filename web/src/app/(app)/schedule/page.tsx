'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useData } from '@/components/DataProvider'
import { Page, VehicleFilter, Status } from '@/components/UI'
import {
  recommendations,
  todayISO,
  dateLabel,
  vehicleLabel,
  addCalendarMonths,
} from '@/lib/maintenance'
export default function SchedulePage() {
  const { data } = useData()
  const [vehicle, setVehicle] = useState('')
  const [month, setMonth] = useState(todayISO().slice(0, 7))
  const [day, setDay] = useState('')
  const tips = recommendations(data).filter(
    (t) => (!vehicle || t.vehicle.id === vehicle) && t.nextDate,
  )
  const records = data.records.filter((r) => !vehicle || r.user_vehicle_id === vehicle)
  const [year, m] = month.split('-').map(Number)
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate()
  const start = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7
  const upcoming = tips
    .filter((t) => ['overdue', 'urgent', 'soon'].includes(t.urgency))
    .sort((a, b) => (a.nextDate || '').localeCompare(b.nextDate || ''))
  return (
    <Page
      title="Lịch bảo dưỡng"
      description="Lịch sử đã thực hiện và mốc tiếp theo của từng hạng mục."
    >
      <div className="toolbar">
        <VehicleFilter value={vehicle} onChange={setVehicle} />
        <div className="actions">
          <button
            className="btn btn-outline"
            aria-label="Tháng trước"
            onClick={() => {
              setMonth(addCalendarMonths(month + '-01', -1).slice(0, 7))
              setDay('')
            }}
          >
            ←
          </button>
          <h2>
            {m}/{year}
          </h2>
          <button
            className="btn btn-outline"
            aria-label="Tháng sau"
            onClick={() => {
              setMonth(addCalendarMonths(month + '-01', 1).slice(0, 7))
              setDay('')
            }}
          >
            →
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setMonth(todayISO().slice(0, 7))
              setDay(todayISO())
            }}
          >
            Hôm nay
          </button>
        </div>
      </div>
      <div className="card panel calendar-wrap">
        <div className="calendar-grid">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
            <span className="calendar-label" key={d}>
              {d}
            </span>
          ))}
          {Array.from({ length: start }, (_, i) => (
            <span key={'blank' + i} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const date = month + '-' + String(i + 1).padStart(2, '0')
            const done = records.filter((r) => r.date === date).length
            const due = tips.filter((t) => t.nextDate === date).length
            return (
              <button
                aria-label={`${dateLabel(date)}, ${done} đã làm, ${due} đến hạn`}
                aria-pressed={day === date}
                key={date}
                className={`calendar-day ${date === todayISO() ? 'today' : ''} ${day === date ? 'selected' : ''}`}
                onClick={() => setDay(day === date ? '' : date)}
              >
                <strong>{i + 1}</strong>
                <span className="calendar-dots">
                  {done > 0 && <i className="dot-done" />}
                  {due > 0 && <i className="dot-due" />}
                </span>
                <small>{due > 0 ? `${due} đến hạn` : done > 0 ? `${done} đã làm` : ''}</small>
              </button>
            )
          })}
        </div>
        <p className="small muted">
          ● Xanh: đã thực hiện · ● Cam: hạn theo thời gian. Xe có thể đến hạn sớm hơn theo số km.
        </p>
      </div>
      {day && (
        <div className="card panel">
          <h2>{dateLabel(day)}</h2>
          {records
            .filter((r) => r.date === day)
            .map((r) => (
              <div className="list-row" key={r.id}>
                <p>
                  {r.items_maintained
                    .map((id) => data.items.find((i) => i.id === id)?.name)
                    .join(', ')}
                </p>
                <span className="status status-ok">Đã thực hiện</span>
              </div>
            ))}
          {tips
            .filter((t) => t.nextDate === day)
            .map((t) => (
              <div className="list-row" key={t.vehicle.id + t.item.id}>
                <p>
                  {vehicleLabel(t.vehicle, data)} · {t.item.name}
                </p>
                <Status value={t.urgency} />
              </div>
            ))}
          {!records.some((r) => r.date === day) && !tips.some((t) => t.nextDate === day) && (
            <p className="muted">Không có sự kiện trong ngày này.</p>
          )}
        </div>
      )}
      <div className="section-heading">
        <h2>Cần theo dõi</h2>
        <Link href="/tips">Tất cả gợi ý ↗</Link>
      </div>
      <div className="card panel">
        {upcoming.map((t) => (
          <Link
            href={`/tips?vehicle=${t.vehicle.id}`}
            className="list-row"
            key={t.vehicle.id + t.item.id}
          >
            <div>
              <h3>{t.item.name}</h3>
              <p className="muted">
                {vehicleLabel(t.vehicle, data)} · {dateLabel(t.nextDate)}
              </p>
            </div>
            <Status value={t.urgency} />
          </Link>
        ))}
        {!upcoming.length && (
          <p className="muted">Chưa có hạng mục cần nhắc. Bổ sung lịch sử để tính mốc còn thiếu.</p>
        )}
      </div>
    </Page>
  )
}
