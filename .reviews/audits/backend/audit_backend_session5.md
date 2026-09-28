# Audit phiên backend #5 — `coding-agent@2026-09-24#5`

*Orchestrator, 2026-09-25. Theo `08-operating-protocol.md`, Phần 5.*

## Kết luận

Công việc thật, đúng phạm vi, đạt đủ tiêu chí hoàn tất của plan. Báo cáo trung thực. Có một câu trong `main-EXP-007` nói quá về giới hạn kiểm thử (xem Phát hiện 2). Đó không phải lỗi code, và agent đã tự khai rằng phần ấy không dùng làm EVIDENCE.

- Chạy lại độc lập toàn bộ kiểm thử (Linux, Python 3.11): **253/253 đạt**, khớp checkpoint của Main.
- Hợp đồng, plan, `CLAUDE.md` trên máy giống hệt bản Orchestrator đã giao.
- Chỉ các tệp của `record_payment`, `view_income_report`, `Backend.py`, `Backend.pyproj` và kiểm thử tiến trình bị sửa. Bốn workflow đã hoàn thiện không bị đụng tới.
- `Backend.pyproj` khớp đúng thư mục thật (43 Compile, 9 Content, 15 Folder). Không có tệp rác trong repo.

## Đối chiếu

| Điểm | Kết quả |
|---|---|
| Luật tip: `outstanding` bỏ tip và hoàn tip; `received_net` giữ tip | Khớp; kiểm lại độc lập: đơn 1.000.000, trả đủ rồi tip 100.000 → 1.100.000 / 0; hoàn tip → 1.000.000 / 0 |
| `record` kiểm vượt khoảng riêng cho hai số, trên tập khoản có khoản mới | Khớp |
| `payment_ledger` có `kind` (6 khóa); thông điệp `409` của `get_balance` không còn nói "nothing was written" | Khớp |
| `view_income_report`: không bảng, không `db_connection`, chỉ bọc ba lời gọi `in_process`; không import chéo | Khớp |
| Ngày của khoản = ngày ghi trong `paid_at`; kỳ gồm hai đầu; `period_from` sau `period_to` → `400` | Khớp |
| Ba con số theo hợp đồng 4.0.0: đơn hủy vẫn tính tiền nhận nhưng không tính nợ; đơn chưa đặt giai đoạn và đơn `delivered` vẫn nợ; cộng giữ dấu; nợ không phụ thuộc kỳ | Khớp |
| `currencies` = hợp hai tập, xếp theo mã; `by_month` chỉ tháng có khoản | Khớp |
| `409` khi một số của output vượt khoảng; `500` khi một lời gọi `in_process` lỗi | Khớp |
| Ráp nối Order 6 sau `update_progress` | Khớp |

**Phép tính tay trong EVIDENCE:** tôi tính lại từng con số trên dữ liệu 5 đơn, 11 khoản. Tất cả đều đúng:

- VND: tiền nhận 3.350.000; tiền hoàn 100.000; theo tháng 800.000 / 200.000 / 2.350.000; còn nợ −100.000 (A +100.000, B −200.000 sau khi bỏ tip, C đã hủy nên không tính).
- USD: tiền nhận 20.000 (khoản đã hủy không tính); còn nợ 60.000.

**Tôi kiểm thêm:**

- Kỳ `0001-01-01..9999-12-31` → `200`, không điền tháng trống.
- Khoản `…T23:59:59Z` thuộc đúng ngày 31/12.
- Tham số query thừa bị bỏ qua.

## Phát hiện

1. **NOTE "nợ của một đơn riêng lẻ vượt khoảng nhưng tổng vẫn trong khoảng → 200": cách hiểu của agent đúng, không cần sửa hợp đồng.** Luật chỉ áp cho số nằm trong output. Tổng vẫn chính xác vì Python dùng số nguyên không giới hạn, và đơn đó vẫn tự báo `409` ở `get_balance`.
2. **`main-EXP-007` nói quá.** Câu viết rằng lời gọi `in_process` thứ hai và thứ ba "không thể thất bại riêng trên DB thật" là không đúng. Tôi đã gây lỗi thật cho từng lời gọi bằng cách đổi tên bảng `stage_change` rồi bảng `payment` từ một kết nối khác. Báo cáo trả đúng `500`, với reason lần lượt có tiền tố `update_progress:` và `record_payment:`, và trở lại `200` khi đổi tên bảng về như cũ. Code đúng. Chỉ câu kinh nghiệm cần sửa, để phiên sau không tin vào một giới hạn không có thật. Đề xuất giao việc nhỏ này ở phiên sau: sửa câu chữ, và nếu muốn thì thêm EVIDENCE thật cho lời gọi thứ hai và thứ ba.
3. **Nhỏ, không cần làm gì:** tham số query lặp lại (ví dụ hai lần `period_from`) lấy giá trị cuối, theo mặc định của FastAPI.

## Đề xuất `status`

- `record_payment` → `đã_hoàn_thiện`.
- `view_income_report` → `đã_hoàn_thiện`.
