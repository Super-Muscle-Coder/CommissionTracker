# Audit phiên backend #7 — `coding-agent@2026-09-25#1`

*Orchestrator, 2026-09-25. Theo `08-operating-protocol.md`, Phần 5.*

## Kết luận

Công việc thật, đúng phạm vi, đạt đủ tiêu chí hoàn tất của plan. Báo cáo trung thực. Hai điểm agent nêu ra đều có thật; tôi đã tái hiện cả hai.

- Chạy lại độc lập toàn bộ kiểm thử (Linux, Python 3.11): **354/354 đạt**, khớp con số trong checkpoint của Main. Lần này EVIDENCE của Main được cập nhật trước khi báo cáo, đúng như plan yêu cầu.
- Hợp đồng, plan, `CLAUDE.md` trên máy giống hệt bản Orchestrator đã giao.
- Việc 1: ba NOTE đã xóa. Ở ba workflow đó, chỉ dòng chú thích thay đổi; không một dòng code nào đổi.
- `Backend.pyproj` khớp đúng thư mục thật (68 tệp). Không có tệp rác. Chín khối checkpoint đều parse được bằng YAML.

## Đối chiếu

| Điểm | Kết quả |
|---|---|
| Năm điểm giao tiếp, đúng địa chỉ và nhãn; `acknowledge` id sai định dạng → `404`; xác nhận hai lần giữ `acknowledged_at` đầu | Khớp |
| Cài đặt mặc định đúng hợp đồng, nằm trong Services, không nằm trong `configs.yaml` | Khớp |
| Kiểm cài đặt: `weekday` theo ngày/tuần, `at_time` `HH:MM`, 1..5 mốc, mốc trùng độ dài (1 ngày = 24 giờ) → `400` | Khớp; kiểm lại độc lập |
| Nhịp tóm tắt bắt đầu từ lúc lưu; chỉ xử lý mốc gần nhất; không có đơn mở thì mốc vẫn tính là đã xử lý; lưu lại thì đếm lại | Khớp |
| Đơn mở = trừ `finished`/`cancelled`; `upcoming` gồm cả đơn quá hạn, hạn sớm trước | Khớp |
| Hạn chót kết thúc 00:00 ngày sau; `due_at` = kết thúc − mốc; chỉ nhắc khi hạn chưa kết thúc | Khớp |
| Nhớ "đã nhắc" theo (đơn, hạn chót, số giờ của mốc), có khóa chính trong bảng | Khớp plan |
| `check_due`: gọi hai workflow khác trước, rồi quyết định và ghi trong một `write_scope` | Khớp `main-EXP-006` |
| Đồng hồ là một Adapter; Main trao đồng hồ thật; chỉ kiểm thử trao đồng hồ giả; không thêm biến `CT_*` | Khớp |
| Không import, không đọc bảng, không khóa ngoại sang workflow khác; bảng `send_reminder_schema_version`; ráp nối Order 6 | Khớp |

Tôi kiểm thêm bằng đồng hồ giả: lỡ mốc tóm tắt thì ra đúng một bản với `due_at` là mốc lỡ, lần kiểm tra sau không ra lại.

## Phát hiện (hai điểm agent nêu, đã tái hiện)

1. **Đổi hạn chót A → B → A.** Các mốc của A đã nhắc không được nhắc lại. Tôi tái hiện được: 1 → 1 → 0.
   - Agent làm đúng plan. Lỗi nằm ở plan tôi viết: plan chọn khóa (đơn, hạn chót, mốc), trong khi hợp đồng ghi chung chung "đổi hạn chót thì nhắc lại".
   - Đề xuất: sửa câu chữ hợp đồng cho khớp cách làm hiện tại, không sửa code. Lý do: họa sĩ đã thấy đúng lời nhắc đó cho đúng hạn chót đó rồi; nhắc lại chỉ làm phiền.
2. **Mốc báo trước quá lớn.** Nếu mốc lớn tới mức thời điểm nhắc rơi trước năm 0001 (khoảng từ 740.000 ngày trở lên), mốc bị bỏ qua mà không ai biết. Tôi tái hiện được với mốc 1.000.000 ngày.
   - Đề xuất: đặt cận trên trong hợp đồng, mỗi mốc tối đa 365 ngày (8.760 giờ), vượt thì `400`. Khi đó trường hợp bị bỏ qua lặng lẽ không còn xảy ra được.
   - Code phải sửa một chỗ nhỏ ở Routers.

## Nhỏ

EVIDENCE đầu tiên của Main (từ phiên 1) ghi lệnh `-k "not commissions"` kèm kết quả "10 passed". Lệnh này giờ chọn nhiều kiểm thử hơn, nên kết quả chạy lại sẽ khác. Agent đã tự nêu. Nên sửa câu lệnh cho khớp ở phiên sau.

## Đề xuất `status`

- Nếu duyệt cận trên ở phát hiện 2: `send_reminder` giữ `đang_triển_khai` tới khi áp cận đó (việc nhỏ, làm ở đầu phiên sau).
- Nếu không duyệt: `send_reminder` → `đã_hoàn_thiện` ngay.
