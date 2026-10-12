# Audit phiên 42, pha 1 — backend, kiểm độc lập (chặng H, câu hỏi 4)

**Ngày audit:** 2026-10-12. **Người audit:** Orchestrator.
**Phiên được audit:** `coding-agent@2026-10-12#?`. Project Owner chưa trả lời câu hỏi số thứ tự phiên trong ngày; pha 2 ghi lại cho đúng.
**Mã được kiểm:** commit `ff33302`. Hợp đồng: Data Schema `10.0.1`, API Contract `6.0.0`.
**Plan:** `.plan/backend_plan.md` (pha 1, chỉ đọc).

## 1. Kết luận

**Pha 1 đạt.** Báo cáo đủ sáu phần theo plan. Phiên không sửa tệp nào trong kho: `git status` rỗng ở đầu và cuối, khớp với kho tôi kéo về. Chín phép cắn tự chọn, cộng tám phép cắn của checkpoint được tái lập.

Báo cáo có giá trị thật. Ba phát hiện tôi chưa thấy ở bước kiểm kê:
- **R42-1:** chuỗi chứa surrogate lẻ làm backend trả 500 dạng chữ thường;
- **R42-3:** mất cờ lưu trữ khi sửa và lưu trữ chen nhau;
- **R42-4:** không kiểm thử nào khóa luật "mỗi workflow chỉ chạm bảng của mình".

Ma trận K6 của phiên (114/114 ô, đo bằng cách gắn đo đạc vào bản sao) khớp kết luận ở `.reviews/stage_h/h1_q3_matrix.md`, phần backend. Hai phép đo làm độc lập.

## 2. Tôi tự kiểm lại

Trên bản sao `git archive` của `ff33302`, Linux, Python 3.13.13.

| Phát hiện | Cách kiểm | Kết quả |
|---|---|---|
| R42-1 | `POST /clients` với `note` = `"\ud800"` (JSON hợp lệ, surrogate lẻ) | **tái lập:** `UnicodeEncodeError` ở `manage_client/adapters.py:124` lúc `INSERT`, không bị `_storage_io` bắt. Trên máy chủ thật đó là 500 không có `error_body` |
| R42-2 | `PUT /reminders/settings`, `at_time` = `"0٩:30"`, `"09:3٠"`, `"０９:30"`, `"09:30"` | **tái lập:** 200, 200, 400, 200; giá trị chữ số Ả Rập được lưu và trả lại nguyên văn. Biểu thức ở `send_reminder/routers.py:43` dùng `\d` |
| R42-3 | đọc `manage_client/services.py:302-324` và `adapters.py:138-152` | **đúng:** `edit` và `set_archived` đều đọc trong một giao dịch rồi ghi cả hàng (kể cả `is_archived`) trong giao dịch khác. Chen nhau thì mất cập nhật |
| R42-10 | `Backend.py:589`; `'²'.isdigit()` = True, `int('٨٠٨٠')` = 8080 | **đúng:** `CT_PORT="²"` qua được `isdigit()` rồi `int()` ném lỗi (mã 1 thay vì 2); chữ số Ả Rập được nhận |
| R42-14 | grep | **đúng** với `LAYER_ROOT` của `test_database_ownership.py`; `signal` chỉ dùng trong chuỗi script con |

Các phát hiện còn lại tôi đọc đối chiếu vị trí, thấy hợp lý; không chạy lại.

## 3. Đánh giá từng phát hiện, và đề xuất

| Mã | Mức (agent) | Đánh giá của Orchestrator | Đề xuất |
|---|---|---|---|
| R42-1 | cao | Đồng ý. Đây là một lối vào trả nhãn không khai báo, phá ranh giới hợp đồng, dù giao diện khó gửi chuỗi như vậy | **pha 2:** Routers từ chối chuỗi không mã hóa được UTF-8 ở mọi trường chữ, trả 400 `ERR_VALIDATION`; ca kiểm thử cho từng trường |
| R42-2 | cao (tác động rất thấp) | Đồng ý, mức trung bình. Giá trị sai được lưu, rồi giao diện đọc lại sẽ thấy vi phạm hợp đồng | **pha 2:** `[0-9]` thay `\d` |
| R42-3 | trung bình | Đồng ý. Với một người dùng trên một cửa sổ, khả năng xảy ra rất thấp, nhưng sửa nhỏ và đúng khuôn của layer | **pha 2:** đọc và ghi trong một giao dịch (`write_scope`) |
| R42-4 | trung bình | Đồng ý. Luật quan trọng nhất của WCA đang chỉ được giữ bằng kỷ luật, không bằng máy | **pha 2:** kiểm thử cấp layer đối chiếu tên bảng trong SQL của mỗi `adapters.py` với workflow sở hữu, kèm phép cắn |
| R42-5 | thấp | Đồng ý | **pha 2:** ca nối ngay sau `READY` |
| R42-6 | thấp | Ví dụ của chính skill (04, `book_appointment`) gọi đồng hồ trong Services. Sửa sáu workflow là nhiều thay đổi cho một lợi ích nhỏ ở V1 | **V2**, ghi lý do |
| R42-7 | thấp | Đã là quyết định có chủ ý (cận của `type` ở Routers) | **pha 2:** chỉ ghi ngoại lệ vào checkpoint của hai workflow, không đổi mã |
| R42-8 | thấp | Đồng ý; CT-5 (Data Schema 9.0.2) đã đưa luật thứ tự ngày vào `type`, nên Routers phải kiểm | **pha 2** |
| R42-9 | thấp | Tham số truy vấn thừa đang được nhận | **CT-10, API Contract 6.1.0:** ghi luật "bỏ qua" vào hợp đồng; pha 2 chỉ gỡ mã chết và thêm ca khóa luật (§4) |
| R42-10 | thấp | Đồng ý | **pha 2:** chỉ nhận chữ số ASCII ở `CT_PORT` và `_SEMVER` |
| R42-11 | thấp | Đồng ý | **pha 2:** xóa 5 NOTES |
| R42-12 | thấp | Đồng ý | **pha 2:** ghi lại là bằng chứng một lần, nêu rõ không chạy lại được; không đưa script đo vào dự án |
| R42-13 | thấp | Đồng ý | **pha 2:** ghi đè về mốc mới nhất, sửa số |
| R42-14 | thấp | Đồng ý | **pha 2** |
| R42-15 | thấp | Đồng ý; phát hiện hay: phép cắn chỉ bị bắt vì ngày cố định trong kiểm thử khác đã trôi về quá khứ | **pha 2** |

**Việc đã biết của backend** (sổ tồn đọng) gộp vào pha 2: BE-8, BE-12 (Starlette), H-10.

## 4. R42-9 và một đính chính của Orchestrator

**Đã quyết (2026-10-12): hướng B, CT-10, API Contract 6.1.0.** Ban đầu tôi đề xuất hướng A và viết rằng "hợp đồng không đổi, vì luật đã có". **Câu đó sai.** Luật của `02-contract.md` Bước 2.3 nói bên nhận từ chối trường thừa *bằng nhãn lỗi định dạng mà điểm giao tiếp đã khai báo*, mà 16 trong 17 lối vào `GET` không khai 400. Hướng A vì thế đòi thêm 400 vào 16 lối vào (thay đổi phá vỡ, API Contract 7.0.0), và giao diện phải khai thêm nhãn đó ở 16 lời gọi. Tôi phát hiện khi soạn plan pha 2, báo Project Owner, và anh chọn lại hướng B. Plan pha 2 ghi thêm: tham số đường dẫn mang mã định danh không trả 400 ở lối vào không khai 400 (R42-1).

Nội dung gốc của câu hỏi, để lưu:

`GET /clients?foo=1` hiện trả 200. Theo `02-contract.md` Bước 2.3, input có trường thừa phải bị từ chối, và với `http` hợp đồng nói các input còn lại đi bằng tham số truy vấn. Hai hướng:
- **A (Orchestrator đề xuất):** từ chối tham số truy vấn không khai báo, trả 400 `ERR_VALIDATION`, ở mọi lối vào `GET`. Hợp đồng không đổi, vì luật đã có. Giao diện, Desktop chỉ gửi tham số đã khai, nên không bên nào vỡ; phiên vá chạy e2e của UI để xác nhận.
- **B:** giữ nguyên, ghi một luật vào hợp đồng rằng tham số truy vấn thừa được bỏ qua. Đây là sửa hợp đồng.

## 5. Ghi nhận về cách làm của phiên

- **Xóa thư mục tạm quá rộng.** Phiên xóa mọi `%TEMP%\ct_*` mà không liệt kê trước, và tự báo điều đó. Kiểm thử của Desktop dùng tiền tố `ct-` (gạch ngang), không trùng. Rủi ro thấp, nhưng plan pha sau sẽ ghi: chỉ xóa đúng thư mục phiên tự tạo.
- **Chạy kiểm thử trong kho** chỉ sinh `__pycache__`, git bỏ qua. Đúng plan.
- **Số thứ tự phiên:** Project Owner chưa trả lời; không phải lỗi của phiên.

## 6. Việc tồn đọng

Ghi vào `.plan/open_issues.md`, mục "Chặng H — phiên kiểm độc lập backend (phiên 42)": R42-1 → R42-15 với quyết định ở §3; R42-6 V2; R42-9 theo CT-10. Mở CT-10 (đã duyệt và ghi).
