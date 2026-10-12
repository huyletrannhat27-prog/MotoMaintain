# Kiểm tra và phần cần cấu hình

## Cập nhật 12/10/2026: giao diện và dữ liệu học

- 35 kiểm thử Node/PostgreSQL và 8 kiểm thử giao diện jsdom đạt. Thêm kiểm tra phân nhóm, tìm AB, xác nhận ghi chú, lịch chạy rà 1.000 → 6.000 km, chu kỳ chỉ theo km/tháng, nâng cấp demo không mất lịch sử, học/từ chối dự báo, khử trùng và kiểm tra dữ liệu JSONL.
- Đã đối chiếu trực quan bảng lịch trong ba PDF chính hãng (Air Blade, Wave Alpha, SH), lưu 5 mẫu theo mã tài liệu và 32 quy tắc; seed official chạy lại được. Đây là dữ liệu tham chiếu, chưa phải tập dữ liệu hư hỏng có nhãn.
- Kiểm tra bộ tính với 100.000 bản ghi giả lập: khoảng 323 ms cho phép tính và kiểm tra số km trong lần chạy cuối trên máy phát triển; không phải SLA của ứng dụng hay kết quả thiết bị thật.
- Pipeline nhập/kiểm tra/huấn luyện offline xử lý 100.000 dòng giả lập trong khoảng 33,81 giây (cùng lúc máy đang build ứng dụng), nhận đủ 100.000 dòng. Ghi chú lặp bị loại khỏi tập đánh giá nên không có tuyên bố độ chính xác từ benchmark này. Chạy lại bằng `node tools/benchmark-import.mjs`.
- Build Next.js và xuất bundle Expo Android/iOS/web thành công với mã mới. Chưa tạo APK/IPA hoặc triển khai lên môi trường thật.
- Công cụ trình duyệt hiện trả inventory rỗng (không có app/browser kết nối), chưa kiểm tra trực quan giao diện mới. Kiểm thử jsdom đã kiểm tra thao tác nhưng không đánh giá bố cục pixel.
- Giới hạn mở rộng, trạng thái từng mô hình và cách nghiệm thu dữ liệu: [ALGORITHMS.md](ALGORITHMS.md), [DATA_GUIDE.md](DATA_GUIDE.md). Mô hình NB chưa có thước đo độ chính xác trên dữ liệu thật; artifact từ pipeline không tự triển khai vào app.

## Kiểm tra nền tảng ở lần bàn giao 10/10/2026

- Bộ nghiệp vụ + PostgreSQL nhúng: 22 kiểm thử đạt. Bao gồm chu kỳ từng hạng mục, mốc tháng/năm nhuận, múi giờ Việt Nam, lịch sử thiếu, số km theo trình tự, ghi nguyên tử, RLS hai người dùng, chặn tự nâng quyền admin và migration/seed chạy lại.
- Form web: 6 kiểm thử React Testing Library/jsdom đạt. Thêm xe → lưu bảo dưỡng → xem gợi ý → mở lại dữ liệu; sửa bản ghi; xác nhận/hủy xóa; lỗi lưu cục bộ; lọc xe; thống kê nhiều hơn 10 bản ghi; trạng thái tài khoản trống.
- Kiểm tra cuối ngày 10/10/2026: lint và TypeScript của web/mobile đạt; build Next.js thành công; xuất bundle Expo cho Android, iOS, web thành công.
- Expo Doctor: 21/21 kiểm tra đạt; `expo install --check`: phiên bản thư viện khai báo phù hợp SDK.
- Đã kiểm tra HTTP các trang chính, gồm trang chủ, đăng nhập, tổng quan, xe, chi tiết xe, nhập bảo dưỡng, lịch sử, gợi ý, lịch, thông tin, cửa hàng và hồ sơ.

## Giới hạn kiểm chứng

- Chưa có URL/key dự án Supabase thật. SQL được kiểm tra bằng PostgreSQL nhúng với mô phỏng `auth.users`, `auth.uid()` và các role. Chưa kiểm chứng email/SMTP, callback xác nhận, deep link khôi phục và đồng bộ hai thiết bị với một dự án cloud thật.
- Chưa kiểm thử trực quan trên trình duyệt/thiết bị thật. Browser Use không có trình duyệt kết nối; Windows Computer Use báo native pipe không khả dụng. Kiểm thử jsdom không kiểm tra bố cục, bản đồ hay quyền định vị.
- Bundle Expo không phải APK/IPA. Chưa build ký bằng EAS, cài lên điện thoại hay xuất bản lên cửa hàng ứng dụng.
- Chu kỳ/giá/thông số trong dữ liệu demo là minh họa. Admin cần nhập đúng mẫu/đời xe và nguồn hướng dẫn trước khi dùng thật; `verified` chỉ bật khi có nguồn HTTPS và đã đối chiếu nội dung.
- Không có dữ liệu cửa hàng xác minh được nhập sẵn. Các bản ghi cửa hàng giả trùng chính xác seed cũ được ẩn để admin xem lại.

## Thư viện

Tại lần kiểm tra này, `npm audit --omit=dev` của web không báo lỗ hổng. Mobile báo 28 cảnh báo trong cây thư viện Expo/React Native (10 moderate, 18 high, gồm nhiều phụ thuộc của công cụ build). Cần đánh giá và nâng phiên bản theo SDK tương thích trước khi phát hành. Không chạy `npm audit fix --force`: các đề xuất tự động có cả hạ Expo xuống SDK 44 / React Native xuống 0.72 hoặc nâng Router khác SDK. Kết quả audit không đồng nghĩa đã xác định được đường khai thác trong app.

## Luồng nghiệm thu trên môi trường thật

1. Chạy schema, nhập danh mục đã xác minh; cấu hình URL/key và email redirect theo README.
2. Tạo hai tài khoản, xác nhận email; kiểm tra mỗi tài khoản chỉ thấy xe/lịch sử của mình.
3. Thêm hai xe, nhập các lần bảo dưỡng khác nhau cho nhớt/phanh. Thay nhớt không làm đặt lại mốc phanh.
4. Nhập bản ghi cũ, sửa/xóa bản ghi, thử số km/ngày không hợp lệ; kiểm tra lịch, gợi ý và thống kê.
5. Mở cùng tài khoản trên app và web; tải lại để kiểm tra đồng bộ. Thử mạng gián đoạn khi tải và lưu.
6. Thử email quên mật khẩu từ web và app; mở đúng redirect/deep link trên thiết bị tương ứng.
7. Kiểm tra bố cục điện thoại, bàn phím form, bản đồ, từ chối định vị, gọi điện và chỉ đường.
8. Kiểm tra tài khoản thường không mở được trang quản trị; admin chỉnh danh mục, chu kỳ và cửa hàng.
