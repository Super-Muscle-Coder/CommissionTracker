# Audit phiên 42, pha 2 — backend (chặng H)

**Ngày audit:** 2026-10-12. **Người audit:** Orchestrator.
**Phiên được audit:** `coding-agent@2026-10-12#1`, pha 2 (vá).
**Plan:** `.plan/backend_plan.md` (pha 2). Hợp đồng: Data Schema `10.0.1`, API Contract `6.1.0`.
**Tệp:** 34 tệp trong `Backend/` (30 sửa, 4 mới), khớp báo cáo. Tôi chép từ máy Project Owner, chồng lên `git archive` của `03cd44b`.

## 1. Kết luận

**Chưa đạt, cần một bản vá nhỏ (pha 2b) trước khi commit.**

Mọi việc của plan đều đã làm, và làm đúng. Riêng ca mới `tests/test_kill_during_writes.py` (H-10) **không ổn định trên Linux**: hỏng 3 trong 4 lượt chạy toàn bộ của tôi, và 2 trong 6 lần chạy riêng. Mọi khẳng định về dữ liệu của ca đều đạt cả khi ca hỏng. Ca chỉ hỏng ở dòng cuối, một khẳng định viết sai ý (§3.1). Một ca không ổn định trái tiêu chí ổn định của chặng H, nên phải sửa trước khi commit.

Ngoài ra có một ghi nhận thấp về giờ ghi checkpoint (§3.2), sửa cùng bản vá.

## 2. Chạy lại

Linux, Python 3.13.13, môi trường mới cài theo `requirements-dev.txt` của phiên (`starlette 1.3.1`, `fastapi 0.136.1`); `pip check` sạch.

| Lượt | Kết quả |
|---|---|
| 1 | 802 passed: thiếu 12 ca vì **lỗi của tôi** lúc chép tệp (script bỏ sót dòng cuối của danh sách, tức `test_view_income_report.py`). Đã sửa, chạy lại ở lượt 4 |
| 2, 3 | 801 passed, 1 failed: `test_kill_during_writes` (trên bộ 802) |
| 4 (đủ 814) | **813 passed, 1 failed:** `test_kill_during_writes` |
| 6 lần chạy riêng ca H-10 | 4 đạt, 2 hỏng |

Agent báo 814 × 3 lượt trên Windows, cộng một lượt sau khi sửa checkpoint. Số ca khớp (814 thu thập). Desktop 79/79 và UI e2e 83/83 tôi không chạy lại: API Contract 6.1.0 không đổi hành vi nào bên gọi nhìn thấy, và R42-1 chỉ đổi phản hồi với chuỗi mà giao diện không gửi.

**Phép cắn riêng của Orchestrator** (bản sao ngoài kho):

| Phép | Kết quả |
|---|---|
| Bỏ kiểm tra UTF-8 ở `manage_commission/routers.py` (2 chỗ) | bị bắt: 8 ca hỏng |
| Thêm SQL đọc bảng `payment` vào `view_income_report/adapters.py` | bị bắt: `test_adapters_touch_only_tables_of_their_own_workflow[view_income_report]` |
| Đổi `_AT_TIME_REGEX` về `\d` | bị bắt: 2 ca (chữ số Ả Rập) |

Không còn `noqa`, `type: ignore`, `pragma`. 10 khối checkpoint YAML hợp lệ, `UNSOLVED_PROBLEMS: []`, không NOTES.

## 3. Phát hiện

### 3.1 Ca H-10 hỏng ngắt quãng vì khẳng định cuối (trung bình)

Dòng cuối của ca: `assert not db_file.with_name(db_file.name + "-journal").exists(), "a hot journal was left behind"`.

Tôi in kích thước và 8 byte đầu của tệp `-journal` ở các lần hỏng: tệp còn đó (16–21 KB), nhưng **8 byte đầu đều bằng 0**. Một journal "nóng" (cần hoàn tác) phải bắt đầu bằng chuỗi nhận dạng của SQLite, `d9 d5 05 f9 20 a1 63 d7`. Tệp có đầu bằng 0 là journal đã vô hiệu: SQLite bỏ qua nó và ghi đè ở giao dịch ghi kế tiếp.

Như vậy khẳng định kiểm sự **tồn tại** của tệp, trong khi điều cần kiểm, và điều thông điệp nói, là journal **nóng**. Ở mọi lần hỏng, các khẳng định về dữ liệu ở trên đều đạt: `integrity_check` là `ok`, không mất bản ghi đã trả 201, không bản ghi dở dang.

Vì sao tệp đôi khi còn lại thay vì bị xóa (chế độ `DELETE`), tôi **không nắm chắc**. Có thể do thời điểm giết rơi vào đúng lúc SQLite đã vô hiệu journal nhưng chưa xóa xong, hoặc do khác biệt hệ điều hành; trên Windows ca đạt cả 4 lượt của agent. Điều đó không đổi kết luận: tệp đầu bằng 0 vô hại.

**Sửa (pha 2b):**
- khẳng định journal **không nóng**: hoặc không có tệp, hoặc 8 byte đầu không phải chuỗi nhận dạng nói trên;
- ghi điều quan sát được vào EVIDENCE của khối có ca này.

Ca vẫn phải bắt được phép cắn agent đã làm (tách `insert` thành hai giao dịch).

### 3.2 Giờ ghi checkpoint dùng lại một giá trị (thấp)

Bảy khối có cùng `last_updated_at: 2026-10-12T19:32:29.993604+07:00`: `manage_client`, `manage_commission`, `update_progress`, `record_payment`, `manage_watermark_profile`, `send_reminder`, `view_income_report`. Một số tệp được sửa muộn hơn, ví dụ `record_payment/services.py` được ghi lần cuối lúc 20:13 (sửa BE-8). Quy ước của dự án (BE-8): lấy `Get-Date -Format o` **ngay trước khi ghi từng khối**.

**Sửa (pha 2b):** cập nhật `last_updated_at` của mọi khối được sửa ở pha 2b bằng giờ lấy ngay trước khi ghi. Không cần sửa ngược các khối không đụng tới ở pha 2b.

### 3.3 Đánh giá các việc của plan

| Việc | Đánh giá |
|---|---|
| BE-12 | đạt: `starlette==1.3.1`, `pip check` sạch; 814 ca đạt trên Python 3.13 (cả Linux, trừ ca H-10 ở §3.1) |
| R42-1 | đạt. Hàm duyệt payload ở Routers của từng workflow, trả 400 có `loc`; tôi đọc `manage_client/routers.py` và cắn ở `manage_commission`. Agent rà đủ các trường, ghi rõ trường nào đã trả 400 trước đó và vì sao |
| R42-2, R42-10 | đạt; phép cắn của tôi bắt được |
| R42-3 | đạt. `edit` và `set_archived` đọc, ghi trong một `write_scope`; `ClientNotFoundError` ném trong khối thì cả giao dịch hoàn tác |
| R42-4 | đạt. Bảng sở hữu đọc từ `_STORAGE_UPGRADES`, không gõ tay; phép cắn của tôi (workflow khác) bắt được |
| R42-5 | đạt có giới hạn: B5b bị bắt, B5 thì không, đã ghi ở `main-EXP-019`. Chấp nhận |
| R42-8 | đạt: thêm 12 ca, `view_income_report` 41 passed |
| R42-9 | đạt: 69 ca cho 17 lối vào `GET`, kèm ca khẳng định danh sách khớp tuyến đăng ký |
| R42-15 | đạt |
| H-10 | nội dung đạt, ca không ổn định: §3.1 |
| R42-7, R42-11 → R42-14, BE-8 | đạt. BE-8 chỉ đổi giờ, đúng plan |

**Xung đột BE-8 và R42-13 do plan của tôi.** BE-8 dặn "không đổi gì khác trong mục đó", R42-13 đòi đưa số liệu về mốc mới. Agent giữ đúng BE-8 và báo xung đột. Chấp nhận: mục BE-7 là bằng chứng có ngày, giữ số liệu của ngày đó là hợp lý.

## 4. Việc tiếp theo

- **Pha 2b, cùng phiên 42:** sửa §3.1 và §3.2; chạy ca H-10 riêng 10 lần liên tiếp, rồi `pytest` toàn bộ 3 lượt. Không cần chạy lại Desktop và UI.
- Sau khi pha 2b đạt: commit `CAS42`, đóng R42-1 → R42-15 (trừ R42-6, V2), BE-8, BE-12, H-10.
