'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Bike, Plus } from 'lucide-react'
import { useData } from '@/components/DataProvider'
import { Page, Empty, ErrorMessage, message } from '@/components/UI'
import VehicleForm from '@/components/VehicleForm'
import { km, vehicleLabel } from '@/lib/maintenance'
import type { UserVehicle } from '@/lib/types'
import { groupOwnedVehicles } from '../../../../../shared/catalog'
export default function VehiclesPage() {
  const { data, deleteVehicle } = useData()
  const [edit, setEdit] = useState<UserVehicle | 'new' | null>(null)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState('')
  return (
    <Page
      title="Xe của tôi"
      description="Chọn xe → ghi nhận việc đã làm → xem mốc cần bảo dưỡng."
      action={
        <button className="btn btn-primary" onClick={() => setEdit('new')}>
          <Plus size={18} /> Thêm xe
        </button>
      }
    >
      <ErrorMessage error={error} />
      {edit && (
        <VehicleForm
          key={edit === 'new' ? 'new' : edit.id}
          vehicle={edit === 'new' ? undefined : edit}
          onDone={() => setEdit(null)}
        />
      )}
      {!data.userVehicles.length && !edit && <Empty text="Thêm chiếc xe đầu tiên" />}
      <div className="journey">
        <span>
          <b>1</b> Chọn xe của bạn
        </span>
        <span>
          <b>2</b> Ghi nhận bảo dưỡng
        </span>
        <span>
          <b>3</b> Theo dõi nhắc nhở
        </span>
      </div>
      {groupOwnedVehicles(data).map((group) => (
        <section className="garage-group" key={group.type}>
          <header className="section-heading">
            <div>
              <h2>
                {group.label} <span className="muted">({group.vehicles.length})</span>
              </h2>
              <p className="muted">{group.examples}</p>
            </div>
          </header>
          <div className="vehicle-grid">
            {group.vehicles.map((v) => (
              <article className="card vehicle-card" key={v.id}>
                <Link href={`/vehicles/${v.id}`} className="vehicle-art">
                  <Bike size={80} strokeWidth={1.1} />
                  <span>{data.vehicles.find((x) => x.id === v.vehicle_id)?.model}</span>
                </Link>
                <Link href={`/vehicles/${v.id}`}>
                  <h2>{vehicleLabel(v, data)}</h2>
                </Link>
                <p className="muted">
                  {v.license_plate || 'Chưa có biển số'} · {v.year || 'Chưa có năm'}
                </p>
                <h3 className="odometer">{km(v.current_km)}</h3>
                <div className="actions">
                  <Link className="btn btn-primary" href={`/input?vehicle=${v.id}`}>
                    Ghi nhận bảo dưỡng
                  </Link>
                  <Link className="btn btn-outline btn-sm" href={`/tips?vehicle=${v.id}`}>
                    Gợi ý bảo dưỡng
                  </Link>
                  <button className="btn btn-outline btn-sm" onClick={() => setEdit(v)}>
                    Sửa
                  </button>
                  <button
                    disabled={!!deleting}
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      if (!confirm('Xóa xe này cùng toàn bộ lịch sử bảo dưỡng của xe?')) return
                      setDeleting(v.id)
                      setError('')
                      try {
                        await deleteVehicle(v.id)
                      } catch (e) {
                        setError(message(e))
                      } finally {
                        setDeleting('')
                      }
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!group.vehicles.length && (
            <p className="group-empty">
              Chưa có {group.label.toLowerCase()}. Bấm “Thêm xe” để tạo hồ sơ.
            </p>
          )}
        </section>
      ))}
    </Page>
  )
}
