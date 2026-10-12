import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MotoMaintain — Quản lý bảo dưỡng xe máy',
  description: 'Theo dõi từng chiếc xe, lưu lịch sử, nhận gợi ý bảo dưỡng và tìm cửa hàng dịch vụ.',
  keywords: 'bảo dưỡng xe máy, Honda, Air Blade, Vision, Lead, Sirius, Wave, lịch bảo dưỡng',
  openGraph: {
    title: 'MotoMaintain',
    description: 'Quản lý lịch bảo dưỡng xe Honda thông minh',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
