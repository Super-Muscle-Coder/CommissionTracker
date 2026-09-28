# Audit phiên backend #8 — `coding-agent@2026-09-25#2`

*Orchestrator, 2026-09-25. Theo `08-operating-protocol.md`, Phần 5.*

## Kết luận

Công việc thật, đúng phạm vi, đạt đủ tiêu chí hoàn tất của plan. Báo cáo trung thực. Ba việc agent làm thêm ngoài chữ của plan đều là hệ quả trực tiếp, đều được khai rõ, và đều đúng.

- Chạy lại độc lập toàn bộ kiểm thử (Linux, Python 3.11): **361/361 đạt**, khớp con số trong checkpoint của Main.
- Chỉ **bốn** tệp đổi, đúng như báo cáo: `routers.py`, `test_send_reminder.py`, `services.py` (chỉ checkpoint) và `Backend.py` (chỉ checkpoint).
- Hợp đồng, plan, `CLAUDE.md` trên máy giống hệt bản Orchestrator đã giao.
- `Backend.pyproj` không bị sửa, và vẫn khớp đúng thư mục thật (68 tệp) — đúng, vì phiên này không tạo tệp mới.
- Chín khối checkpoint đều parse được bằng YAML. Toàn layer không còn `UNSOLVED_PROBLEMS` nào, và chỉ còn ba NOTE, đều là những NOTE đã được chấp nhận.

## Đối chiếu

| Việc | Kết quả |
|---|---|
| 1. Cận trên `lead_times` đặt ở Routers (`_LeadTimeFormat`), lấy đúng giá trị từ hợp đồng | Khớp |
| 1. Kiểm thử hai phía của cận, cả hai đơn vị | Khớp |
| 1. Code phòng thủ ở Services giữ nguyên, không gỡ | Khớp |
| 2. Hai NOTE của `send_reminder` đã xóa | Khớp |
| 2. `send_reminder-EXP-006` mới, có `derived_from: send_reminder-EXP-002` | Khớp |
| 3. EVIDENCE đầu của Main: đổi cách chọn, giữ nguyên `claim` và `result` | Khớp |
| 4. EVIDENCE toàn layer của Main cập nhật theo lần chạy cuối (361) | Khớp |
| Không sửa code workflow khác, không đụng `.contracts/`, không bắt đầu workflow mới | Khớp |

**Tôi kiểm lại độc lập:**

- Cận trên: `365 days` và `8760 hours` được nhận; `366 days`, `8761 hours`, `1.000.000 days` và `2^53−1 hours` đều trả `400`, không lưu gì.
- Luật cũ vẫn còn hiệu lực bên cạnh luật mới: `8760 hours` cùng `365 days` trong một bộ vẫn bị `400` vì trùng độ dài.
- Mốc 365 ngày chạy đúng: đơn hạn `2027-09-30` cho `due_at` `2026-10-01T00:00:00+07:00`.
- **Mục EVIDENCE đầu của Main:** lệnh cũ `-k "not commissions"` nay chọn **26** bài, tức là mục đó thật sự không còn tái lập được; lệnh mới theo node ID chọn đúng **10** bài, khớp `result` đã ghi. Vấn đề có thật, và cách sửa đúng.

## Ba việc ngoài chữ của plan — chấp nhận cả ba

1. **Hai kiểm thử cũ dùng mốc vượt cận** (`MAX_INT` giờ, `17.000.000` giờ) buộc phải sửa. Không sửa thì chính luật mới làm hỏng bộ kiểm thử.
2. **EVIDENCE cấp workflow của `send_reminder` không còn tái lập được** (60 → 67 bài). Agent chạy lại và ghi đè, thay vì để một con số sai nằm lại. Đây đúng là bài học của chính việc 3 trong plan.
3. **Tham chiếu treo.** Trong `send_reminder-EXP-002` có câu "(xem NOTES)", mà NOTES thì vừa bị xóa. Agent tự phát hiện và đổi thành "(xem send_reminder-EXP-006)".

Mục 3 không có trong plan và tôi cũng không nghĩ tới. Đây đúng là loại hỏng hóc âm thầm mà checkpoint dễ mắc: một mục trỏ tới thứ không còn tồn tại, không ai để ý cho tới khi một phiên sau đọc và hiểu sai.

**Về kiểm thử đường phòng thủ:** sau khi có cận trên, không còn đường nào qua điểm giao tiếp chạm tới nhánh `OverflowError` trong Services. Agent giữ nhánh đó và đổi kiểm thử sang ghi thẳng mốc vượt cận vào bảng `reminder_settings` — **bảng của chính workflow này**, nên không vi phạm ranh giới. Cách này giống tiền lệ kiểm thử nâng cấp bảng của `manage_client` ở phiên 3.

## Quy ước mới trong `CLAUDE.md`

Cả hai đều có tác dụng ngay ở phiên đầu tiên áp dụng:

- **Tường thuật ba phần:** agent nêu căn cứ ở từng bước, ví dụ vì sao chọn node ID thay vì thêm marker pytest vào `pytest.ini`. Nhờ đó tôi đối chiếu được quyết định với plan mà không phải đọc lại toàn bộ diff.
- **Cách sửa `Backend.pyproj`:** phiên này không phải sửa tệp đó, nên chưa kiểm chứng được. Để phiên sau.

## Đề xuất `status`

- `send_reminder` → `đã_hoàn_thiện`.

Sau mục này, toàn bộ phần backend không phụ thuộc watermark đã xong: tám workflow `đã_hoàn_thiện`, còn lại `backup_data`, `apply_watermark` và `verify_watermark`.
