import Link from 'next/link'
export default function NotFound() {
  return (
    <main className="workspace">
      <div className="card empty-state">
        <h1>Không tìm thấy trang</h1>
        <p className="muted">Đường dẫn có thể đã thay đổi.</p>
        <Link href="/dashboard" className="btn btn-primary">
          Về tổng quan
        </Link>
      </div>
    </main>
  )
}
