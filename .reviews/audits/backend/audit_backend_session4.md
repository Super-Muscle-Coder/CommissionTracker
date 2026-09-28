# Audit phiên backend #4 — `coding-agent@2026-09-24#4`

*Orchestrator, 2026-09-24. Theo `08-operating-protocol.md`, Phần 5.*

## Kết luận

Công việc thật, đúng phạm vi, đạt đủ tiêu chí hoàn tất của plan. Báo cáo trung thực. Ba điểm agent làm lệch plan đều được nêu rõ và có lý do đúng.

- Chạy lại độc lập toàn bộ kiểm thử (Linux, Python 3.11): **216/216 đạt**, khớp checkpoint của Main.
- Hợp đồng, plan, `CLAUDE.md` trên máy giống hệt bản Orchestrator đã giao. `manage_client`, `manage_commission`, `scaffold_backend` không bị đụng tới.
- `Backend.pyproj` khớp đúng thư mục thật (36 Compile, 8 Content, 13 Folder). Không có tệp rác trong repo.
- Agent đọc đúng trình tự. Trước khi code, agent báo đúng cách xử lý đồng thời mà plan yêu cầu nói trước.

## Đối chiếu

| Điểm | Kết quả |
|---|---|
| `record` → `409 ERR_OUT_OF_RANGE`, không ghi gì. Kiểm tra và ghi nằm trong một giao dịch (`BEGIN IMMEDIATE` + RLock) | Khớp |
| `get_balance` → `409` khi số dư vượt khoảng; `void_payment` không bị chặn | Khớp |
| `paid_at` `+07:60` → `400` | Khớp |
| `update_progress`: sáu điểm giao tiếp, đúng `form`, địa chỉ, nhãn; `list_stages` không có `500` | Khớp |
| Đơn mới: `queued`/`active`/`updated_at: null`, không ghi gì khi đọc, lịch sử `[]`, không có trong board | Khớp |
| Luật chuyển giai đoạn: `finished`/`cancelled` là cuối; trùng giai đoạn → `409`, kể cả chuyển đơn mới sang `queued`; được lùi lại | Khớp |
| Lịch sử: `from_stage` đầu là `null`, chuỗi liền, cũ nhất trước, không bao giờ sửa. Giai đoạn hiện tại suy ra từ dòng cuối; khóa chính `(commission_id, position)` chặn rẽ nhánh | Khớp; thiết kế tốt hơn yêu cầu |
| Lưu `kind` lúc chuyển; catalog sai → không `READY`, mã thoát 2 | Khớp |
| Không import, không đọc bảng, không khóa ngoại sang workflow khác; bảng `update_progress_schema_version`; ráp nối Order 4 sau `record_payment`, giữ `list_progress_board` | Khớp |
| `main-EXP-006` (khuôn "kiểm tra rồi ghi" nguyên tử) thuộc về cả layer | Đúng chỗ |

Tôi kiểm thêm, ngoài kiểm thử của agent:

- **Luật tổng tính ra:** `refund` 1 trên đơn giá 2^53−1 → `409`. Tình huống "hủy khoản làm số dư vượt khoảng": `void` → `200`, sau đó `get_balance` → `409`.
- **Đồng thời:** 20 lời chuyển giai đoạn cùng lúc trên một đơn → 17 × `200`, 3 × `409` (trùng giai đoạn), chuỗi lịch sử liền.
- **Thân yêu cầu sai:** `note` là số, `to_stage` là `null`, thiếu thân, thừa khóa → đều `400`.

## Ba điểm lệch plan: chấp nhận cả ba

1. **`to_stage` ngoài catalog được kiểm ở Routers** chứ không ở Services. Hệ quả: một đơn không tồn tại kèm giai đoạn sai sẽ nhận `400` thay vì `404`. Hợp lý: ràng buộc nằm trong `type`, làm giống tiền lệ `currency` của `manage_commission`, và cả hai nhãn đều đã khai báo.
2. **Luật hợp lệ của catalog nằm ở hàm khởi tạo của Services** chứ không ở Main. Main vẫn thoát khi catalog sai. Chỗ này tốt hơn plan: Main chỉ làm việc hậu cần.
3. **NOTE mới ở `record_payment`:** nếu giá đơn bị sửa đúng lúc một lời `record` đang chạy, khoản vẫn có thể được ghi. Đây là giới hạn tự nhiên khi dữ liệu nằm ở hai workflow khác nhau. `get_balance` vẫn báo `409`, nên số liệu không bao giờ sai âm thầm. Không cần hành động; NOTE có thể giữ lại để ghi dấu.

## Nhỏ, không chặn

Thông điệp của `409` ở `get_balance` ghi "nothing was written", câu vốn chỉ đúng cho thao tác ghi. Gốc là chính câu `meaning` của `ERR_OUT_OF_RANGE` trong hợp đồng do Orchestrator soạn. Có thể sửa câu chữ ở lần sửa hợp đồng tiếp theo.

## Đề xuất `status`

- `record_payment` → `đã_hoàn_thiện`.
- `update_progress` → `đã_hoàn_thiện`.
