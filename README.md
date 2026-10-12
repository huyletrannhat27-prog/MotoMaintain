# MotoMaintain

Ứng dụng web và mobile quản lý bảo dưỡng xe máy. Web dùng Next.js; app dùng Expo Router / React Native. Hai ứng dụng dùng cùng tài khoản Supabase và cùng bộ tính chu kỳ trong `shared/`.

Kết quả kiểm thử, giới hạn đã biết và các bước nghiệm thu trước khi phát hành: [CHECKS.md](CHECKS.md).

**Bản cập nhật 12/10/2026:** chọn xe theo nhóm tay ga/xe số, tìm AB/SH/Wave, ghi nhận bảo dưỡng theo từng bước; bổ sung 5 mẫu theo tài liệu Honda và 32 quy tắc có nguồn. Có ước tính mức sử dụng bằng Theil–Sen, hỗ trợ ghi chú bằng từ điển + Naive Bayes và pipeline JSONL để chuẩn bị dữ liệu học. Xem [so sánh thuật toán](ALGORITHMS.md) và [hướng dẫn dữ liệu](DATA_GUIDE.md).

## Chạy thử ngay

Yêu cầu Node.js 24 LTS và npm. Các ứng dụng cài thư viện độc lập để giữ đúng phiên bản React của Next.js và Expo.

```powershell
# Tại thư mục MotoMaintain
npm --prefix web ci
npm --prefix web run dev
```

Mở http://localhost:3000. Khi chưa cấu hình Supabase, chọn **Khám phá bản dùng thử**. Dữ liệu minh họa được lưu trong trình duyệt; trang luôn hiển thị nhãn DÙNG THỬ. Không dùng mật khẩu hoặc dữ liệu thật ở chế độ này.

Chạy app trong terminal khác:

```powershell
npm --prefix mobile ci
npm --prefix mobile start
```

Quét QR bằng Expo Go phù hợp SDK 57 hoặc dùng development build. Có thể xem bản web của app bằng `npm --prefix mobile run web`. Dữ liệu dùng thử của app lưu riêng trên thiết bị, không đồng bộ với bản web Next.js.

## Chức năng

- Trang chủ, đăng ký/đăng nhập, xác nhận email, quên/đặt lại mật khẩu, hồ sơ cá nhân.
- Quản lý nhiều xe: mẫu xe, tên gọi, biển số, màu, năm, ngày mua và số km hiện tại; hồ sơ riêng từng xe.
- Thêm, sửa, xóa lịch sử bảo dưỡng; lưu hạng mục, chi phí, cửa hàng và ghi chú; tìm kiếm, lọc theo xe và thời gian.
- Gợi ý bảo dưỡng **riêng từng hạng mục của từng xe**; mốc km và thời gian, trạng thái quá hạn/đến hạn/sắp đến hạn/chưa đến hạn/chưa đủ dữ liệu, phụ tùng và giá tham khảo.
- Tổng quan, thống kê chi phí theo xe/tháng, biểu đồ chi phí trên web.
- Lịch tháng trên web, danh sách lịch theo tháng trên app; mốc đã hoàn tất được tính lại từ lịch sử hiện tại.
- Danh sách cửa hàng, tìm kiếm và chỉ đường; bản đồ và định vị gần tôi trên web. App mở ứng dụng bản đồ qua liên kết.
- Quản trị trên web: mẫu xe, hạng mục và chu kỳ, nguồn tài liệu, phụ tùng, cửa hàng. Chỉ tài khoản admin được truy cập.

## Kết nối Supabase thật

1. Tạo dự án Supabase hoặc dùng dự án của bạn. Trong SQL Editor, chạy `web/supabase/schema.sql`. Script hỗ trợ cả cơ sở dữ liệu mới và cấu trúc ban đầu của dự án; có thể chạy lại. Sao lưu dữ liệu hiện có trước khi áp dụng migration trên môi trường thật.
2. Chạy `web/supabase/seed-official.sql` để thêm 5 mẫu theo mã tài liệu Honda và 32 quy tắc có nguồn. Nếu cần thêm danh mục minh họa, chạy **tùy chọn** `web/supabase/seed-demo.sql`: 5 mẫu xe, 20 hạng mục và 5 gợi ý phụ tùng `verified=false`. Cả hai seed không thêm người dùng/xe cá nhân/lịch sử/cửa hàng giả và không ghi đè mục có cùng ID.
3. Sao chép `web/.env.local.example` thành `web/.env.local`, `mobile/.env.example` thành `mobile/.env.local`. Điền URL và **anon/publishable key** của cùng dự án. Không dùng `service_role` trong web/app.
4. Trong Supabase Authentication → URL Configuration, đặt Site URL và các Redirect URLs phù hợp:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback?next=/reset-password`
   - URL HTTPS tương ứng khi triển khai web.
   - `motomaintain://login` và `motomaintain://reset-password` cho app đã build.
   - Khi thử bằng Expo Go, thêm đúng URL `exp://.../--/login` và `exp://.../--/reset-password` của phiên chạy. Scheme riêng ổn định khi dùng development/production build.
5. Bật email/password, cấu hình xác nhận email và SMTP khi đưa vào sử dụng thật. Luồng web dùng PKCE: mở liên kết email trên cùng trình duyệt đã yêu cầu. App xử lý token từ deep link.
6. Khởi động lại dev server / build lại khi thay biến môi trường. Đăng ký tài khoản trên web hoặc app.

Để cấp quyền cho tài khoản quản trị đầu tiên, thực hiện trong SQL Editor với UUID tài khoản bạn đã kiểm tra:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID-TAI-KHOAN-QUAN-TRI';
```

Đăng nhập lại rồi mở `/admin/vehicles` hoặc `/admin/settings`. Thêm danh mục đúng mẫu **và đời xe**, nguồn hướng dẫn, chu kỳ và cửa hàng đã xác minh. Tài khoản thường không thể tự đổi `role`.

Web tải lại dữ liệu khi quay lại cửa sổ. App tải lại khi trở về foreground hoặc kéo xuống để làm mới. Các lần lưu đều tải lại dữ liệu. Không có cơ chế ghi ngoại tuyến cho tài khoản thật; lỗi kết nối sẽ hiển thị để thử lại.

## Quy tắc bảo dưỡng

- Với mỗi hạng mục, lấy bản ghi gần nhất **có chứa hạng mục đó**, không lấy lần bảo dưỡng chung của xe.
- Hạng mục thường: mốc km = km gần nhất + chu kỳ. Hạng mục `odometer_based`: dùng mốc km tích lũy tiếp theo và mốc chạy rà `first_service_km` nếu có. Mốc ngày = ngày thực hiện + số tháng lịch, có xử lý cuối tháng/năm nhuận. Chu kỳ bằng 0 nghĩa là không có mốc của chiều đó; không được để cả km và tháng cùng bằng 0.
- Ưu tiên điều kiện km hoặc ngày đến trước. Quá hạn nếu vượt mốc; đến hạn khi còn ≤200 km hoặc ≤7 ngày; sắp đến hạn khi còn ≤500 km hoặc ≤30 ngày. Đây là ngưỡng nhắc của ứng dụng.
- Thiếu lịch sử thì hiển thị **Chưa đủ dữ liệu**, không tự giả định xe đã quá hạn. Ngày mua không được xem là một lần bảo dưỡng.
- Thanh tiến độ là tỷ lệ đã đi qua chu kỳ, **không phải phép đo hao mòn**.
- Nhập lịch sử cũ không làm giảm đồng hồ km hiện tại. Ngày/số km phải nhất quán với bản ghi trước và sau. Khi xóa bản ghi, số km thực tế được giữ lại.
- Chu kỳ/giá demo cần được đối chiếu đúng tài liệu hãng và đời xe trước khi dùng thật. Tham khảo [sách hướng dẫn Honda](https://www.honda.com.vn/xe-may/dich-vu-sau-ban-hang/huong-dan-su-dung) và [danh sách cửa hàng Honda](https://www.honda.com.vn/xe-may/danh-sach-cua-hang).

## Kiểm tra

```powershell
npm --prefix tools ci
npm --prefix tools test
npm --prefix web test
npm --prefix web run lint
npm --prefix web run typecheck
npm --prefix web run build
npm --prefix mobile run lint
npm --prefix mobile run typecheck
# Chạy trong thư mục mobile:
npx expo-doctor
npx expo export --platform android --platform ios --platform web
```

`tools/` kiểm tra logic và chạy SQL trên PostgreSQL nhúng PGlite với hai tài khoản thường và một admin. Kiểm tra quyền sở hữu, chặn nâng quyền, ghi nguyên tử, ngày/km không hợp lệ, migration chạy lại và bảo vệ lịch sử. `web/tests/` kiểm tra form và luồng bằng React Testing Library + jsdom. Chúng không thay thế kiểm thử trình duyệt, điện thoại thật và Supabase/SMTP thực tế.

Để tạo APK nội bộ bằng tài khoản Expo của bạn, chạy trong `mobile`: `npx eas-cli@latest build --platform android --profile preview`. Cần cấu hình dự án EAS, application ID và biến môi trường build của bạn. `expo export` chỉ tạo bundle, **không phải APK/IPA đã ký**. Chưa triển khai web hay đưa app lên cửa hàng ứng dụng.

## Cấu trúc

```text
shared/                   Kiểu dữ liệu, tính chu kỳ, kiểm tra đầu vào, dữ liệu demo
web/src/app/              Trang web và callback xác thực
web/src/components/       Provider dữ liệu, form và giao diện dùng chung
web/supabase/schema.sql   Schema, RLS, trigger kiểm tra, RPC lưu nguyên tử
web/supabase/seed-demo.sql Danh mục minh họa tùy chọn
web/supabase/seed-official.sql Danh mục Honda có nguồn, giới hạn đúng mã tài liệu
ALGORITHMS.md      So sánh thuật toán, phần đã dùng và lộ trình mở rộng
DATA_GUIDE.md      Chuẩn dữ liệu và pipeline JSONL offline
mobile/src/app/           Expo Router: đăng nhập, tabs và màn hình chi tiết
mobile/src/lib/           Supabase, phiên đăng nhập và dữ liệu app
tools/                    Kiểm thử nghiệp vụ và cơ sở dữ liệu
```

Nhắc bảo dưỡng hiện hiển thị trong ứng dụng; chưa tích hợp push notification, đặt lịch giao dịch với cửa hàng hoặc thanh toán.
