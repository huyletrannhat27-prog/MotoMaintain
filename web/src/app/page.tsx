import Link from 'next/link'
import { Bike, CalendarDays, ArrowUpRight, Wrench, ShieldCheck } from 'lucide-react'
import { isConfigured } from '@/lib/config'
export default function Home() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link href="/" className="brand">
          <Bike size={30} /> MotoMaintain<span className="brand-dot">.</span>
        </Link>
        <Link href="/login" className="btn btn-outline">
          Đăng nhập <ArrowUpRight size={16} />
        </Link>
      </nav>
      <main className="landing-hero">
        <div>
          <p className="eyebrow">CHĂM XE ĐỀU ĐẶN · AN TÂM MỖI HÀNH TRÌNH</p>
          <h1>
            Xe khỏe.
            <br />
            Bạn <span>an tâm.</span>
          </h1>
          <p className="hero-copy">
            Một nơi để theo dõi từng chiếc xe, lưu lại mỗi lần bảo dưỡng và biết chính xác hạng mục
            nào cần chú ý tiếp theo.
          </p>
          <div className="actions">
            <Link
              href={isConfigured ? '/register' : '/dashboard'}
              className="btn btn-primary btn-lg"
            >
              {isConfigured ? 'Bắt đầu với xe của bạn' : 'Khám phá bản dùng thử'}{' '}
              <ArrowUpRight size={18} />
            </Link>
            <a href="#features" className="btn btn-outline btn-lg">
              Tìm hiểu thêm
            </a>
          </div>
          <p className="muted small">
            Dành cho xe tay ga và xe số · Trải nghiệm trên web và điện thoại
          </p>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit" />
          <Bike className="hero-bike" strokeWidth={1} />
          <div className="hero-note">
            <span className="status status-ok">Luôn có kế hoạch</span>
            <h3>Từng xe. Từng hạng mục.</h3>
            <p className="muted">
              Nhớt, phanh, lọc gió và lốp xe
              <br />
              được theo dõi riêng biệt.
            </p>
            <div className="hero-line" />
          </div>
          <div className="hero-tag">MỖI CHUYẾN ĐI ĐỀU QUAN TRỌNG ↗</div>
        </div>
      </main>
      <section id="features" className="landing-features">
        {[
          {
            icon: Wrench,
            title: 'Hiểu chiếc xe của bạn',
            text: 'Lưu số km, lịch sử và chi phí của từng chiếc xe trong một hồ sơ.',
          },
          {
            icon: CalendarDays,
            title: 'Biết mốc bảo dưỡng tiếp theo',
            text: 'Theo dõi đồng thời số km và thời gian, ưu tiên mốc đến trước.',
          },
          {
            icon: ShieldCheck,
            title: 'Gợi ý có cơ sở',
            text: 'Xem lý do, lịch sử và nguồn chu kỳ; nhận biết khi chưa đủ dữ liệu.',
          },
        ].map((f) => (
          <article key={f.title}>
            <f.icon size={24} />
            <h2>{f.title}</h2>
            <p className="muted">{f.text}</p>
          </article>
        ))}
      </section>
      <footer className="landing-footer">
        MotoMaintain · Chăm sóc xe, bắt đầu từ những điều nhỏ.
      </footer>
    </div>
  )
}
