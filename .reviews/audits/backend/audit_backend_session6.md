# Audit phiên backend #6 — `coding-agent@2026-09-24#6`

*Orchestrator, 2026-09-25. Theo `08-operating-protocol.md`, Phần 5.*

## Kết luận

Code và EVIDENCE của `manage_watermark_profile` đạt đủ tiêu chí của plan. Hai việc dở từ phiên 5 đã làm đúng. Không phát hiện điều gì không trung thực.

Phiên **kết thúc chưa trọn**. Agent nói sẽ cập nhật EVIDENCE của Main sau khi bộ kiểm thử đầy đủ chạy xong, nhưng việc đó chưa xảy ra: checkpoint của Main vẫn ghi "253 passed, sáu workflow" của phiên 5. Cũng chưa có báo cáo cuối phiên.

- Chạy lại độc lập toàn bộ kiểm thử (Linux, Python 3.11): **293/293 đạt**.
- Hợp đồng, plan, `CLAUDE.md` trên máy giống hệt bản Orchestrator đã giao.
- Không sửa code của workflow nào đã hoàn thiện. Ở `record_payment` và `view_income_report`, chỉ checkpoint thay đổi, đúng như plan cho phép.
- `Backend.pyproj` khớp đúng thư mục thật (60 tệp). Không có tệp rác. Tám khối checkpoint đều parse được bằng YAML.

## Đối chiếu

| Điểm | Kết quả |
|---|---|
| Việc 1: `main-EXP-007` viết lại thành `main-EXP-008`, có `derived_from`; ghi kỹ thuật đổi tên bảng như kỹ thuật kiểm thử của layer, nói rõ chỉ kiểm thử được làm vậy | Khớp |
| Việc 2: EVIDENCE thật cho lời gọi thứ hai và thứ ba (`500` với đúng tiền tố `update_progress:` / `record_payment:`, rồi `200` giống hệt); không sửa code | Khớp |
| NOTE của `view_income_report` chuyển thành `EXP-004` (`derived_from: EXP-002`); NOTE đề xuất `status` ở `view_income_report` và `record_payment` đã xóa | Khớp |
| Sáu điểm giao tiếp, đúng `form`, địa chỉ, nhãn; `list_strengths` không có `500` | Khớp |
| `profile_input` đủ 5 khóa, strict; `display_name` 1..80; ba trường tự do không thêm ràng buộc; `default_strength` ngoài danh sách → `400` | Khớp |
| id sai định dạng: `PUT` → `400`; `GET` và `in_process` → `404` | Khớp |
| `strength_presets` kiểm ở Services, phải đúng `[subtle, balanced, robust]`; sai → thoát mã 2, không `READY` (5 biến thể) | Khớp |
| Không xóa, không lưu trữ hồ sơ; không cột thời điểm trong output; bảng `manage_watermark_profile_schema_version`; không gọi ai | Khớp |
| Ráp nối Order 4 sau `update_progress`; giữ `get_watermark_profile` trong `in_process` | Khớp |

## Phát hiện

1. **EVIDENCE của Main đã cũ.** Checkpoint vẫn ghi 253 kiểm thử, sáu workflow. Thực tế là 293 kiểm thử, bảy workflow. Cần cập nhật ở phiên sau: một việc nhỏ, không đổi code.
2. **Hai NOTE đề xuất `status` còn sót** ở `update_progress` (phiên 4) và `manage_commission` (phiên 3). Cả hai đã được duyệt từ lâu. Đây là thiếu sót của các plan trước, không phải của agent. Nên xóa cùng lúc với mục 1.
3. **Thứ tự danh sách với tên tiếng Việt.** Agent tự ghi nhận: sắp theo `casefold` là sắp theo mã ký tự, nên "Ánh" đứng sau "z". `client_list` của `manage_client` cũng bị như vậy. Không sai hợp đồng, vì hợp đồng không quy định thứ tự. Đây là một điểm trải nghiệm cho người dùng tiếng Việt: có thể sửa ở backend (sắp theo tên đã bỏ dấu), hoặc để giao diện tự sắp. Để người vận hành quyết.

## Đề xuất `status`

- `manage_watermark_profile` → `đã_hoàn_thiện`.

Mục 1 và 2 chỉ là việc dọn checkpoint, không ảnh hưởng ranh giới, nên không cần chặn đề xuất này.
