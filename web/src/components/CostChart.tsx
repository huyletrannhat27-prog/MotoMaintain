'use client'
import type { MaintenanceRecord } from '@/lib/types'
import { money } from '@/lib/maintenance'
export default function CostChart({ records }: { records: MaintenanceRecord[] }) {
  const totals = new Map<string, number>()
  records.forEach((r) =>
    totals.set(r.date.slice(0, 7), (totals.get(r.date.slice(0, 7)) || 0) + (r.cost || 0)),
  )
  const months = [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6)
  const max = Math.max(1, ...months.map(([, cost]) => cost))
  return (
    <section className="card panel">
      <div className="section-heading">
        <h2>Chi phí theo tháng</h2>
        <span className="small muted">6 tháng có bản ghi gần nhất</span>
      </div>
      {months.length ? (
        <div className="cost-chart" role="list" aria-label="Chi phí theo tháng">
          {months.map(([month, cost]) => (
            <div className="cost-column" role="listitem" key={month}>
              <span className="small">{money(cost)}</span>
              <div className="cost-track">
                <div
                  className="cost-bar"
                  style={{ height: `${Math.max(cost ? 2 : 0, (cost / max) * 100)}%` }}
                />
              </div>
              <span className="small muted">
                {month.slice(5)}/{month.slice(0, 4)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Chưa có dữ liệu trong bộ lọc này.</p>
      )}
    </section>
  )
}
