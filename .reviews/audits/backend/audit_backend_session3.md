# Audit phiên backend #3 — `coding-agent@2026-09-24#3`

*Orchestrator, 2026-09-24. Theo `08-operating-protocol.md`, Phần 5.*

## Kết luận

Công việc thật, đúng phạm vi, đạt đủ tiêu chí hoàn tất của plan. Báo cáo và checkpoint trung thực: mọi điều agent ghi trong EVIDENCE đều khớp với code, và chỗ hợp đồng còn hở mà agent ghi vào NOTES là có thật (đã tái hiện).

- Chạy lại độc lập toàn bộ kiểm thử (Linux, Python 3.11): **166/166 đạt**, khớp con số trong checkpoint của Main.
- Đọc toàn bộ năm lớp của `record_payment` và mọi phần sửa ở `manage_client`, `manage_commission`, `Backend.py`. So từng dòng với bản của phiên 2.
- Hợp đồng, plan, `CLAUDE.md` trên máy không bị đụng tới. `07-checkpoint-protocol.md` trong `.claude` đã giống hệt bản v2.2 (chỉ khác ký tự xuống dòng).
- `Backend.pyproj` khớp đúng 37 tệp thật (30 Compile, 7 Content, 11 Folder). Không có tệp rác ở đâu trong repo.

## Đối chiếu với plan và hợp đồng

| Điểm | Kết quả |
|---|---|
| Việc 1: `manage_commission` chặn `amount_minor` ở 2^53−1; NOTE cũ đã xóa; EVIDENCE có 201/400 ở hai biên | Khớp |
| Việc 2: đổi tên bảng phiên bản `manage_client` trong cùng giao dịch; bước nâng cấp số 1 **không bị sửa**; có kiểm thử từ cấu trúc cũ và kiểm thử hoàn tác khi khởi động lỗi | Khớp, làm kỹ hơn yêu cầu |
| Việc 3: `requirements.txt` ghi Python 3.13, không đổi phiên bản thư viện | Khớp |
| Việc 4: năm điểm giao tiếp, đúng `form`, địa chỉ, nhãn; id sai định dạng ở ba điểm GET/PUT → 404 | Khớp |
| `payment_record` 9 khóa, `ledger_entry_record` 5 khóa, `commission_balance` 4 khóa | Khớp |
| 404 qua `get_commission_summary`; 500 của nó → 500; 422 khi khác đơn vị tiền; 409 khi hủy lần hai (một câu `UPDATE … WHERE is_voided = 0`, có kiểm thử 8 lời hủy đồng thời) | Khớp |
| Số dư tính lại từ khoản chưa hủy, bằng `int`, không lưu tổng; có thể âm | Khớp |
| `payment_list` kể cả khoản đã hủy, mới nhất trước theo thời điểm thật | Khớp |
| Không import workflow khác, không đọc bảng khác, không khóa ngoại; bảng `record_payment_schema_version` | Khớp |
| Ráp nối ở Order 4, giữ `list_payment_ledger` trong `in_process` | Khớp |
| Việc 5: hai NOTE của Main đã xóa, không thêm kinh nghiệm thừa | Khớp |
| Checkpoint: id kinh nghiệm được viết lại đổi số và có `derived_from` trỏ về id cũ, đúng 07 v2.2 | Khớp |
| Lỗi lưu trữ là lỗi thật (khóa `BEGIN EXCLUSIVE`, kết nối `query_only`); `monkeypatch` chỉ dùng để chứng minh lỗi lập trình *không* thành 500 | Đúng tinh thần plan |

## Phát hiện

1. **Tổng tính ra vượt ±(2^53−1) — chỗ hở của hợp đồng, agent đã tự phát hiện và ghi NOTE.** Đã tái hiện: đơn giá 2^53−1, hai khoản 2^53−1 → `received_net` = 18014398509481982, vượt luật số nguyên của Clause A. Không phải lỗi triển khai: hợp đồng chưa nói phải làm gì. Chỗ hở này cũng sẽ có ở `view_income_report` (cộng dồn qua nhiều đơn). Đề xuất: xem báo cáo gửi người vận hành.
2. **Thứ tự `payment_ledger`**: hợp đồng không quy định; agent chọn cũ nhất trước theo `paid_at`, rồi `payment_id`, và đã ghi rõ. Hợp lý. Đề xuất ghi vào hợp đồng (làm rõ, không phá vỡ).
3. **Nhỏ, không chặn:** `paid_at` có phút lệch múi giờ ≥ 60 (ví dụ `+07:60`) được nhận và âm thầm đổi thành `+08:00`. Phần lẻ giây dài hơn 6 chữ số bị cắt về micro giây. Nên chặn `+hh:mm` với mm ≤ 59 ở Routers khi sửa mục 1.

## Đề xuất `status`

- `manage_commission` → `đã_hoàn_thiện`.
- `record_payment` giữ `đang_triển_khai` cho tới khi chốt mục 1, vì cách xử lý sẽ đổi code và có thể đổi nhãn kết quả của nó.
