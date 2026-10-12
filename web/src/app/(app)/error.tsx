'use client'
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="workspace">
      <div role="alert" className="card panel">
        <h1>Chưa tải được trang</h1>
        <p className="muted">Kiểm tra kết nối rồi thử lại.</p>
        <button className="btn btn-primary" onClick={reset}>
          Thử lại
        </button>
      </div>
    </div>
  )
}
