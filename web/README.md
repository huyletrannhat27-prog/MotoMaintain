# MotoMaintain web

Ứng dụng Next.js với App Router và Supabase. Chạy `npm ci`, sau đó `npm run dev`, mở http://localhost:3000.

Xem [README chung](../README.md) để cấu hình Supabase, nhập dữ liệu, tạo admin, chạy app và kiểm thử. Khi chưa có Supabase, giao diện mở ở chế độ dùng thử có lưu cục bộ.

Kiểm tra: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

Logic chu kỳ dùng chung nằm ở `../shared/`. Cần giữ thư mục này khi build/deploy, không chỉ sao chép riêng `web/`.
