'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useData } from '@/components/DataProvider'
import { Page, Empty } from '@/components/UI'
import RecordForm from '@/components/RecordForm'
function InputContent() {
  const { data } = useData()
  const query = useSearchParams()
  const [saved, setSaved] = useState(false)
  const id = query.get('edit')
  const record = data.records.find((r) => r.id === id)
  if (id && !record)
    return <Empty text="Không tìm thấy bản ghi" href="/history" label="Về lịch sử" />
  return (
    <Page
      title={id ? 'Sửa lần bảo dưỡng' : 'Ghi nhận bảo dưỡng'}
      description="Lưu những gì đã làm, để lần chăm sóc tiếp theo đúng lúc."
      action={
        <Link href="/vehicles" className="btn btn-outline">
          Quản lý xe
        </Link>
      }
    >
      {!data.userVehicles.length ? (
        <Empty text="Thêm xe trước khi ghi nhận bảo dưỡng" />
      ) : saved ? (
        <div className="card empty-state">
          <span className="status status-ok">Đã lưu thành công</span>
          <h2>Xe đã được cập nhật.</h2>
          <p className="muted">Mốc bảo dưỡng của các hạng mục vừa làm đã được tính lại.</p>
          <div className="actions">
            <Link href="/tips" className="btn btn-primary">
              Xem gợi ý mới
            </Link>
            <Link href="/history" className="btn btn-outline">
              Xem lịch sử
            </Link>
            <button className="btn btn-ghost" onClick={() => setSaved(false)}>
              Nhập tiếp
            </button>
          </div>
        </div>
      ) : (
        <RecordForm
          key={id || query.get('vehicle') || 'new'}
          record={record}
          initialVehicle={query.get('vehicle') || ''}
          initialItem={query.get('item') || ''}
          onDone={() => setSaved(true)}
        />
      )}
    </Page>
  )
}
export default function InputPage() {
  return (
    <Suspense fallback={<p>Đang tải…</p>}>
      <InputContent />
    </Suspense>
  )
}
