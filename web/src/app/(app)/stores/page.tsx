'use client'
import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useData } from '@/components/DataProvider'
import { Page, ErrorMessage } from '@/components/UI'
import type { HondaStore } from '@/lib/types'
const Map = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <p className="panel">Đang tải bản đồ…</p>,
})
function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180
  const d =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(d), Math.sqrt(1 - d))
}
export default function StoresPage() {
  const { data } = useData()
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selected, setSelected] = useState<HondaStore | null>(null)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const stores = useMemo(
    () =>
      data.stores
        .filter(
          (s) =>
            s.is_active !== false &&
            (!city || s.city === city) &&
            [s.name, s.address]
              .join(' ')
              .toLocaleLowerCase('vi')
              .includes(search.toLocaleLowerCase('vi')),
        )
        .map((s) => ({ ...s, distance: location ? distance(location, s) : undefined }))
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)),
    [data.stores, location, city, search],
  )
  return (
    <Page
      title="Cửa hàng dịch vụ"
      description="Tìm nơi chăm sóc xe và mở chỉ đường khi cần."
      action={
        <button
          disabled={busy}
          className="btn btn-primary"
          onClick={() => {
            setError('')
            if (!navigator.geolocation) {
              setError('Trình duyệt chưa hỗ trợ định vị.')
              return
            }
            setBusy(true)
            navigator.geolocation.getCurrentPosition(
              (p) => {
                setLocation({ lat: p.coords.latitude, lng: p.coords.longitude })
                setBusy(false)
              },
              () => {
                setError('Chưa lấy được vị trí. Bạn vẫn có thể tìm theo tên hoặc thành phố.')
                setBusy(false)
              },
              { timeout: 10000, maximumAge: 60000 },
            )
          }}
        >
          {busy ? 'Đang định vị…' : 'Tìm gần tôi'}
        </button>
      }
    >
      <ErrorMessage error={error} />
      <div className="toolbar">
        <label className="input-group">
          Tên hoặc địa chỉ
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm cửa hàng"
          />
        </label>
        <label className="input-group">
          Thành phố
          <select className="input" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Tất cả</option>
            {[...new Set(data.stores.map((s) => s.city))].sort().map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      {data.stores.length > 0 ? (
        <>
          <div className="map-panel">
            <Map
              stores={stores}
              userLocation={location}
              selectedStore={selected}
              onSelectStore={setSelected}
            />
          </div>
          <p className="muted small">
            Khoảng cách hiển thị theo đường thẳng, không phải quãng đường di chuyển.
          </p>
          <div className="store-grid">
            {stores.map((s) => (
              <article className="card panel" key={s.id}>
                <h2>{s.name}</h2>
                <p className="muted">
                  {s.address}, {s.city}
                </p>
                <p className="small muted">
                  {s.opening_hours || 'Liên hệ để biết giờ mở cửa'}
                  {s.distance != null && ` · ${s.distance.toFixed(1)} km`}
                </p>
                <div className="actions">
                  <button className="btn btn-outline btn-sm" onClick={() => setSelected(s)}>
                    Trên bản đồ
                  </button>
                  <a
                    className="btn btn-primary btn-sm"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                  >
                    Chỉ đường ↗
                  </a>
                  {s.phone && (
                    <a
                      className="btn btn-ghost btn-sm"
                      href={`tel:${s.phone.replace(/[^+0-9]/g, '')}`}
                    >
                      Gọi điện
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!stores.length && <p className="notice">Không có cửa hàng khớp bộ lọc.</p>}
        </>
      ) : (
        <div className="card empty-state">
          <h2>Chưa có cửa hàng được xác minh</h2>
          <p className="muted">
            Quản trị viên có thể bổ sung địa chỉ, tọa độ và thông tin liên hệ.
          </p>
          <a
            href="https://www.honda.com.vn/xe-may/danh-sach-cua-hang"
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline"
          >
            Tra cứu cửa hàng Honda ↗
          </a>
        </div>
      )}
    </Page>
  )
}
