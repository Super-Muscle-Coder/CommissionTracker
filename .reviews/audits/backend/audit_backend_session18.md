# AUDIT — PHIÊN 18 (LAYER BACKEND, BE-5 VÀ BE-6: LUẬT NOT BLANK)

*Orchestrator, 2026-09-28. Đối chiếu với `.plan/backend_plan.md` (plan phiên 18), Data Schema 8.0.0 (`clause_a_common.formats.not_blank`, `client_input`, `commission_input`, `profile_input`), API Contract 4.0.0, `07-checkpoint-protocol.md`, và checkpoint của `manage_client`, `manage_commission`, `manage_watermark_profile`. Định danh phiên của agent: `coding-agent@2026-09-28#3`. Mốc so sánh: commit `7cac6cc` trên GitHub, là trạng thái ngay trước phiên.*

## 1. Kết luận

**Đạt.** Mọi khẳng định trong báo cáo và trong EVIDENCE đều được xác nhận độc lập trên máy thứ hai (Linux, Python 3.13.13, pydantic 2.12.5, đúng bản khóa trong `requirements.txt`). Không tìm thấy lỗi nào chặn.

Cả ba workflow **đủ điều kiện `đã_hoàn_thiện`**. Việc đổi `status` là sửa hợp đồng, nên Orchestrator chỉ đề xuất (§6) và chờ Project Owner duyệt.

Có một phát hiện cần xử lý **trước khi commit** (§5, Q18-1): e2e ghi đè toàn bộ 27 tệp bằng chứng đã commit trong `UI/evidence/`.

## 2. Phạm vi sửa: đúng 9 tệp

Orchestrator liệt kê thời điểm sửa của mọi tệp trong `Backend/` trên máy Project Owner, so với mốc commit `7cac6cc` (21:16). Sau mốc đó chỉ có đúng 9 tệp đổi, khớp báo cáo:
- `routers.py`, `services.py` và tệp kiểm thử của mỗi workflow trong ba workflow.

Ngoài ra, Orchestrator kiểm các chỗ agent không được sửa:
- `.contracts/`: không đổi.
- `.plan/`: không đổi.
- `UI/src/`: không đổi.
- `Desktop/src/`: không đổi.
- `Backend.pyproj`: không đổi, và cũng không cần đổi vì không có tệp mới.
- `Backend/shared/`: không được tạo, đúng quyết định của Project Owner.

Ngoài `Backend/`, chỉ có `UI/evidence/` đổi (xem Q18-1).

## 3. Những gì đã tự chạy lại

| Hạng mục | Báo cáo agent | Orchestrator chạy lại | Kết quả |
|---|---|---|---|
| `pytest -q` toàn backend | 445 (381 + 64) | 445 passed, hai lần liên tiếp | khớp, ổn định |
| Theo workflow | 70 / 73 / 47 | 70 / 73 / 47 | khớp |
| Cắn: bỏ phép kiểm `_not_blank` | 24 / 8 / 8 hỏng | 24 / 8 / 8 hỏng | khớp |
| Cắn: đổi thành lưu bản đã bỏ khoảng trắng (`return value.strip()`) | — | 1 / 1 / 1 hỏng (ca "lưu nguyên văn") | bắt được |
| UI e2e với backend mới | 17/17 | 17/17, hai lần (Linux, Xvfb) | khớp |
| Desktop `npm test` | 14/14 (Windows) | Không tái lập được trên Linux (xem dưới) | dựa vào kết quả Windows cùng e2e |

Chi tiết cho hàng Desktop `npm test`:
- Trên Linux, 7 trong 14 ca hỏng, **cả với backend phiên 17 lẫn backend phiên 18**, và hỏng đúng cùng 7 ca.
- Nguyên nhân: các ca đó gọi `powershell.exe` để dựng cây tiến trình. Đây là giới hạn nền tảng của bộ kiểm thử Desktop, không phải lỗi hồi quy.
- Đường đi Desktop → backend thật → giao diện đã được e2e phủ (17/17, hai lần). Vì vậy Orchestrator chấp nhận con số 14/14 trên Windows của agent.

`%APPDATA%\CommissionTracker`:
- Orchestrator không kiểm tra lại được từ đây, vì không có shell trên máy Project Owner.
- Mọi kiểm thử backend dùng thư mục tạm (`tmp_path`). Script tạm của agent dùng `%TEMP%\ct_s18_*`.
- Không thấy đường dẫn thật nào trong 9 tệp.

## 4. Đối chiếu với hợp đồng và plan

### 4.1 Cơ chế

- Mỗi `routers.py` có một hàm `_not_blank` riêng, giống hệt nhau (`if not value.strip(): raise ValueError(...)`, rồi trả nguyên `value`). Hàm được gắn bằng `AfterValidator` sau `StringConstraints`, đúng quyết định "mỗi workflow tự giữ" của Project Owner.
- Đúng **năm trường**, không hơn:
  - `display_name`, `contacts[].channel`, `contacts[].value` của `client_input`;
  - `title` của `commission_input`;
  - `display_name` (bút danh) của `profile_input`.
- `channel` và `value` có thêm `min_length=1`. Điều này thừa về logic, vì chuỗi rỗng đã là blank, nhưng không đổi hành vi: vẫn 400, cùng `loc`, chỉ khác `msg`. Chấp nhận.
- Các trường tùy chọn (`note`, `description`, `commission_type`, `legal_name`, `contact`, `ownership_statement`) không bị đụng. Có kiểm thử khẳng định `"   "`, `"\t"` và `""` được nhận và lưu nguyên văn.

### 4.2 Hình dạng lỗi

Orchestrator tự gửi yêu cầu qua `TestClient`, dùng đúng `create_http_app` và Routers thật. Kết quả:
- Một trường trống: `400`, `{"code":"ERR_VALIDATION","message":"Invalid client_input.","details":{"errors":[{"loc":["client_input","display_name"],"msg":"Value error, must not be blank"}]}}`. Đúng khuôn `details` cũ, không có `422`.
- Ba trường trống cùng lúc: `details.errors` có đúng ba mục, mỗi mục một `loc`:
  - `["client_input","display_name"]`;
  - `["client_input","contacts","0","channel"]`;
  - `["client_input","contacts","0","value"]`.

  Giao diện nhờ đó chỉ được đúng từng ô.
- Kiểu sai (`null`, `123`, `["x"]`): vẫn `400` "Input should be a valid string", tại cùng `loc`. Hành vi cũ không đổi.

### 4.3 Độ dài tính trên giá trị gốc

- 120 ký tự có dấu (`Ệ`, U+1EC6, một điểm mã) được nhận.
- Chuỗi gồm dấu cách, 118 ký tự, rồi dấu cách (tổng 120) được nhận và lưu đủ 120 ký tự.
- 122 ký tự bị `400`.

Cả ba đúng cách đọc Project Owner đã xác nhận. Tương tự cho 200 ký tự của `title` và 80 ký tự của bút danh.

### 4.4 Ca biên agent không thử: khoảng trắng hiếm

Orchestrator so **toàn bộ mặt phẳng BMP** giữa `str.isspace` của Python 3.13 và `String.prototype.trim` của Node 24:
- chỉ Python coi là khoảng trắng: `U+001C..U+001F`, `U+0085`;
- chỉ JavaScript coi là khoảng trắng: `U+FEFF`.

Khớp chính xác "giới hạn đã biết" trong checkpoint của cả ba workflow.

Gửi thử qua HTTP cho kết quả đúng như dự đoán:
- `\u0085`, `\x1c`, `\u2003`, `\u2028`, `\r`, `\x0b` → `400`;
- `\u200b`, `\ufeff` → `201`.

Hậu quả thực tế ở V1 không đáng kể:
- Với `U+FEFF`, giao diện bỏ nó trước khi gửi, nên họa sĩ bị chặn ngay ở giao diện.
- Với `U+0085` và `U+001C..U+001F`, giao diện cho qua, backend trả 400, và giao diện hiện lỗi chung.
- Không ai gõ các ký tự này bằng bàn phím.

### 4.5 "Không ghi gì" khi bị từ chối

Mọi ca từ chối đều có hai kiểm tra:
- tạo: so `GET` danh sách trước và sau;
- sửa: so `GET` bản ghi với đúng bản trước.

Tập giá trị trống đủ năm dạng plan yêu cầu: `""`, `"   "`, `"\t\n"`, `U+00A0`, `U+3000`. Orchestrator đã kiểm từng byte trong tệp: ký tự là `0xa0` và `0x3000` thật, không phải dấu cách thường.

## 5. Phát hiện

### Q18-1 (trung bình) — e2e ghi đè bằng chứng đã commit của giao diện

Plan yêu cầu agent chạy `npm run e2e` trong `UI/` để kiểm hồi quy. Lệnh này ghi lại **toàn bộ 27 tệp** trong `UI/evidence/`, gồm:
- 26 tệp ở `walkthroughs/`;
- `b2a/main_layout.png`.

Cả 27 tệp đều đang được git theo dõi.

Báo cáo của agent ghi 17 tệp; con số đúng là 27. Orchestrator đếm theo thời điểm sửa trên đĩa, rồi đối chiếu với `git ls-files`.

Chỗ hỏng: vì `CT_WALKTHROUGH_RUNNER` không được đặt, ba tệp `*-run.json` giờ ghi runner là `"unknown (Playwright, …)"`, thay cho `coding-agent@2026-09-28#2`. Nói cách khác, bằng chứng kịch bản bấm thử mà Project Owner đã chấp nhận ở phiên 17 bị thay bằng một lần chạy không rõ người chạy.

**Việc cần làm ngay, trước khi commit phiên 18:**

```powershell
cd E:\CommissionTracker
git restore UI/evidence
git status
```

`git status` sau đó chỉ được còn 9 tệp của `Backend/workflows/`.

**Việc lâu dài, ghi thành UI-8:**
- `npm run e2e` không ghi vào `UI/evidence/` trừ khi đặt `CT_WALKTHROUGH_RUNNER`, và chỉ khi đó mới ghi bằng chứng; hoặc
- tách hai chế độ: chạy kiểm hồi quy thì ghi ra thư mục tạm, còn ghi bằng chứng thì dùng một lệnh riêng.

Làm ở phiên giao diện D2, vì rẻ.

### Q18-2 (thông tin) — bộ kiểm thử Desktop không chạy được ngoài Windows

Ghi nhận ở §3. Không phải việc của V1, vì dự án đóng gói cho Windows trước. Không mở mục mới.

## 6. Đề xuất sửa hợp đồng — chờ Project Owner duyệt

**Data Schema 8.0.0 → 8.0.1** (chỉ cập nhật `status`, là thay đổi Z theo `02-contract.md`; tiền lệ v1.1.1):

```
#   v8.0.1 — [Clause B, SỬA] status of manage_client, manage_commission,
#            manage_watermark_profile: đang_triển_khai -> đã_hoàn_thiện —
#            Stage-6 proposals of backend session #18 (BE-5, BE-6) verified
#            by the Orchestrator (08, Part 5): independent re-run 445/445
#            twice on another machine; bite tests reproduced (24/8/8); the
#            not_blank rule applies to exactly the five required names of
#            v7.0.0 and v8.0.0, values stored verbatim; no unsolved problem.
```

Kèm theo:
- đổi ba dòng `status` trong `clause_b_backend`;
- sửa `version` thành `8.0.1`.

API Contract không đổi.

Khi được duyệt, Orchestrator ghi tệp, đọc lại để xác nhận, và cập nhật `CLAUDE.md` mục 6.

## 7. Checkpoint

Orchestrator trích và parse cả ba khối bằng YAML: đều hợp lệ.
- `last_updated_by: coding-agent@2026-09-28#3`.
- `UNSOLVED_PROBLEMS: []`.
- Mỗi khối có một NOTE đề xuất `đã_hoàn_thiện`.
- Không trùng id.

Đánh số lại EXPERIENCES đúng `07-checkpoint-protocol.md`: mục cũ được viết lại thì xóa khỏi khối, và mục mới trỏ `derived_from` về id cũ; không dùng lại id nào.

| Workflow | Mục cũ → mục viết lại | Mục mới |
|---|---|---|
| `manage_client` | EXP-004 → EXP-007 | EXP-008 (luật not blank) |
| `manage_commission` | EXP-005 → EXP-006 | EXP-007 |
| `manage_watermark_profile` | EXP-003 → EXP-005 | EXP-006 |

Một mục EVIDENCE cũ của `manage_commission` được ghi đè:
- trước: 93 passed;
- sau: 143 passed, ngày mới.

Việc này đúng luật "chỉ giữ bằng chứng mới nhất cho mỗi khẳng định".

## 8. Việc tiếp theo

1. Project Owner chạy `git restore UI/evidence`, rồi commit 9 tệp của phiên 18.
2. Project Owner duyệt hoặc bác đề xuất 8.0.1 ở §6.
3. Soạn plan chặng D2 (giao diện đơn hàng), trong đó:
   - bổ sung I1 ở `ui_decomposition.md`: tiêu đề not blank; văn bản tùy chọn để trống thì gửi `null`;
   - vá UI-8.
4. Sau đó: phiên dọn dẹp desktop (DSK-12, DSK-13, DSK-14). ENV-4 vẫn chờ Project Owner.
