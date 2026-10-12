'use client'
import { useState } from 'react'
import { useData } from '@/components/DataProvider'
import { Page } from '@/components/UI'
import { money } from '@/lib/maintenance'
import { intervalLabel, manualSources } from '../../../../../shared/knowledge'
import { vehicleGroups } from '../../../../../shared/catalog'
export default function InfoPage() {
  const { data } = useData()
  const [model, setModel] = useState(data.vehicles[0]?.id || '')
  const [category, setCategory] = useState('')
  const items = data.items.filter(
    (i) => i.vehicle_id === model && (!category || i.category === category),
  )
  return (
    <Page title="Thông tin bảo dưỡng" description="Tra cứu chu kỳ và chi phí theo mẫu xe.">
      <div className="toolbar">
        <label className="input-group">
          Mẫu xe
          <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
            {vehicleGroups.map((group) => (
              <optgroup key={group.type} label={group.label}>
                {data.vehicles
                  .filter((v) => v.type === group.type)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} · {v.model}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="input-group">
          Nhóm hạng mục
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="engine">Động cơ</option>
            <option value="brake">Phanh</option>
            <option value="filter">Bộ lọc</option>
            <option value="tires">Lốp</option>
            <option value="electrical">Điện</option>
            <option value="body">Thân xe</option>
            <option value="other">Khác</option>
          </select>
        </label>
      </div>
      <p className="notice">
        Chu kỳ phụ thuộc đời xe và điều kiện sử dụng.{' '}
        <a
          target="_blank"
          rel="noreferrer"
          href="https://www.honda.com.vn/xe-may/dich-vu-sau-ban-hang/huong-dan-su-dung"
        >
          Tra sách hướng dẫn Honda ↗
        </a>
      </p>
      <div className="tips-grid">
        {items.map((i) => (
          <article className="card panel" key={i.id}>
            <p className="eyebrow">{i.is_critical ? 'HẠNG MỤC CẦN CHÚ Ý' : 'BẢO DƯỠNG ĐỊNH KỲ'}</p>
            <h2>{i.name}</h2>
            <p className="muted">{i.description}</p>
            <dl className="detail-grid">
              <div>
                <dt>Chu kỳ</dt>
                <dd>{intervalLabel(i)}</dd>
              </div>
              <div>
                <dt>Giá tham khảo</dt>
                <dd>
                  {i.estimated_cost_max
                    ? `${money(i.estimated_cost_min)} – ${money(i.estimated_cost_max)}`
                    : 'Chưa có báo giá'}
                </dd>
              </div>
            </dl>
            <p className="small muted">
              {i.verified
                ? 'Đã đối chiếu nguồn bởi quản trị viên.'
                : 'Chưa xác minh chu kỳ cho đúng đời xe.'}
            </p>
            {i.source_url && /^https?:\/\//.test(i.source_url) && (
              <a href={i.source_url} target="_blank" rel="noreferrer">
                Xem nguồn ↗
              </a>
            )}
          </article>
        ))}
      </div>
      {!items.length && <div className="card empty-state">Chưa có hạng mục cho lựa chọn này.</div>}
      <section className="garage-group">
        <h2>Thư viện tài liệu chính hãng</h2>
        <p className="muted">
          Đã đối chiếu bảng bảo dưỡng của 3 tài liệu. Chọn đúng mã xe; không áp dụng lịch SH cho AB
          hoặc Wave.
        </p>
        <div className="tips-grid">
          {manualSources.map((source) => (
            <article className="card panel" key={source.id}>
              <h3>{source.title}</h3>
              <p>{source.scope}</p>
              <p className="small muted">
                Trang {source.pages} · đối chiếu {source.checked}
              </p>
              <a href={source.url} target="_blank" rel="noreferrer">
                Mở tài liệu Honda ↗
              </a>
            </article>
          ))}
        </div>
      </section>
    </Page>
  )
}
