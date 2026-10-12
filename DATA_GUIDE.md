# Chuẩn bị dữ liệu để MotoMaintain học

## Dữ liệu nhập trực tiếp

Chọn **Xe của tôi → Xe tay ga / Xe số → mẫu xe đúng mã/đời → xe của bạn → Ghi nhận bảo dưỡng**. Nhập ngày và số km lúc bảo dưỡng, chọn những việc đã làm; chi phí/cửa hàng có thể để trống. Ghi chú có thể đề xuất hạng mục nhưng chỉ được chọn khi bạn bấm xác nhận.

Lịch sử này tự tham gia tính mốc hãng và ước tính mức sử dụng. Ghi chú chỉ học trong tài khoản, theo cùng mẫu xe; cần đủ ví dụ và không có nhiều nhãn lẫn trong một ghi chú. Không có nghĩa là cứ nhập vài dòng thì có thể chẩn đoán chính xác mọi hỏng hóc.

## Tập dữ liệu bạn cung cấp sau

Công cụ hiện nhận **JSONL UTF-8: mỗi dòng một đối tượng**. CSV/Excel/PDF cần chuyển và ánh xạ cột trước; chưa có OCR/tự hiểu file bất kỳ. Cần giữ bản gốc để truy vết các dòng cần sửa.

```json
{
  "vehicle_key": "bike-anon-001",
  "model_id": "ab125-2025",
  "date": "2026-09-01",
  "km": 6000,
  "item_ids": ["ab125-2025-oil"],
  "notes": "Đã thay nhớt máy",
  "cost": 150000,
  "confirmed": true
}
```

| Trường        | Ý nghĩa                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `vehicle_key` | Mã giả danh ổn định cho mỗi xe, 1–80 ký tự chữ/số/gạch ngang/gạch dưới; không dùng biển số, email hoặc số điện thoại          |
| `model_id`    | Mã mẫu trong danh mục local, không phải tên tự do; không tự ghép AB125 với AB160                                              |
| `date`        | Ngày làm thật, YYYY-MM-DD; không ở tương lai                                                                                  |
| `km`          | Số công-tơ-mét lúc làm, số nguyên không âm; không phải số km chạy trong ngày                                                  |
| `item_ids`    | Danh sách mã hạng mục của chính mẫu xe; ghi chú nhiều hạng mục vẫn được giữ nhưng không dùng huấn luyện bộ phân loại một nhãn |
| `notes`       | Mô tả tối đa 2.000 ký tự; không đưa dữ liệu cá nhân không cần thiết                                                           |
| `cost`        | Tùy chọn, số nguyên đồng không âm; không biết thì bỏ trường                                                                   |
| `confirmed`   | `true` chỉ khi nhãn đã được người nhập/người kiểm tra xác nhận                                                                |

Lấy danh mục ánh xạ:

```powershell
node tools/export-catalog.mjs > catalog.json
```

Các ID trên là ID local của bộ dữ liệu chuẩn bị. Seed SQL sử dụng UUID xác định; pipeline offline **không tự nhập bản ghi này vào tài khoản Supabase**. Nếu cần nhập lịch sử thật vào Supabase, phải ánh xạ vehicle_key sang xe thuộc tài khoản, model/item local sang UUID và dùng API có kiểm tra quyền. Không dùng service-role key trong file dữ liệu.

Chạy với Node.js 24. SQLite tích hợp có thể in cảnh báo ExperimentalWarning tùy phiên bản Node:

```powershell
node tools/prepare-data.mjs D:/du_lieu/bao-duong.jsonl D:/du_lieu/ket-qua-lan-01 2026-09-01
```

Thư mục cha phải tồn tại, thư mục kết quả phải **chưa tồn tại**. Lệnh cố ý không ghi đè lần chạy cũ. Các bản ghi trước ngày cắt dùng để học; từ ngày cắt trở đi dùng đánh giá. Nếu bỏ ngày cắt, học trên toàn bộ dữ liệu hợp lệ và báo chưa có tập kiểm tra, không có con số độ chính xác.

Đầu ra:

- `accepted.jsonl`: dữ liệu qua kiểm tra kiểu, mẫu xe, lịch sử và trùng lặp.
- `review.jsonl`: số dòng và lý do cần xem lại; dòng trùng được ghi riêng, giữ bản đầu.
- `review.sqlite`: dữ liệu trung gian trên đĩa phục vụ kiểm tra; chứa ghi chú gốc, cần bảo quản như tập dữ liệu đầu vào.
- `models.json`: mô hình NB riêng mỗi mẫu xe, từ vựng giới hạn; **artifact để đánh giá, chưa tự triển khai vào app**.
- `report.json`: SHA-256 nguồn, số hợp lệ/lỗi/trùng, số ví dụ học/kiểm tra, số đúng trên các câu được trả lời, coverage và thống kê theo nhãn. Không có câu trả lời thì độ chính xác là `null`, không phải 100%.

Pipeline kiểm tra số km theo xe sau khi đọc toàn bộ các lô. Nếu số km mâu thuẫn hoặc một mã xe mang hai mẫu xe, cả nhóm được đưa sang review để người phụ trách kiểm tra. Khử trùng dùng xe + mẫu + ngày + km + tập hạng mục; thông tin bổ sung khác nhau không tự ghi đè bản đầu. Ghi chú kiểm tra trùng nội dung chuẩn hóa với ghi chú học cùng mẫu bị loại khỏi phép đánh giá để giảm rò rỉ dữ liệu.

Các kiểm tra này bảo đảm định dạng và một số tính nhất quán, **không chứng minh sự kiện bảo dưỡng thật đã xảy ra**. Cần kiểm tra chất lượng nhãn, độ phủ mẫu xe và dữ liệu mất cân bằng trước khi dùng kết quả.

## Bổ sung lịch hãng vào Supabase

1. Chạy lại `web/supabase/schema.sql` để thêm trường mốc chạy rà và cách tính theo công-tơ-mét; migration giữ dữ liệu cũ.
2. Chạy `web/supabase/seed-official.sql`: thêm 5 mẫu theo mã tài liệu và 32 quy tắc có nguồn. Chạy lại không tạo bản sao hoặc ghi đè mục admin đã sửa.
3. `seed-demo.sql` vẫn là danh mục minh họa riêng, không cần chạy để dùng danh mục chính hãng. Bản demo local tự thêm danh mục mới và giữ xe/lịch sử đã lưu.
4. Không đổi mẫu cho xe có lịch sử chỉ để áp dụng tài liệu mới: cần đối chiếu đời xe và ánh xạ từng hạng mục. Hiện app chủ động chặn đổi mẫu khi đã có lịch sử.

Khi có dữ liệu thật, ưu tiên gửi từ điển cột, đơn vị, ý nghĩa nhãn và vài dòng đã bỏ thông tin cá nhân trước. Đối chiếu mô hình theo [ALGORITHMS.md](ALGORITHMS.md); không dùng tập giả lập của kiểm thử làm bằng chứng về độ chính xác dự báo thực tế.
