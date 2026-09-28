# ===WCA-PLAN===
# session_for: backend
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-09-28T20:40:00+07:00
# contract: data_schema 8.0.0, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 18 của dự án, phiên backend thứ mười một. Đây là **phiên ngắn, gom mọi việc còn mở của layer backend có thể làm ngay**. Nội dung: áp luật "not blank" (`formats.not_blank`) mà Data Schema 7.0.0 và 8.0.0 đã thêm vào hợp đồng, cho **năm trường tên bắt buộc** thuộc ba workflow:

| Mục | Workflow | Trường | Hợp đồng |
|---|---|---|---|
| **BE-5** | `manage_client` | `client_input.display_name`, `client_input.contacts[].channel`, `client_input.contacts[].value` | 7.0.0 (CT-2) |
| **BE-6** | `manage_commission` | `commission_input.title` | 8.0.0 (CT-3) |
| **BE-6** | `manage_watermark_profile` | `profile_input.display_name` (bút danh) | 8.0.0 (CT-3) |

Cả ba workflow đang ở `đang_triển_khai`. Cuối phiên, đề xuất đưa cả ba về `đã_hoàn_thiện`.

**Điểm dừng:**
- năm trường từ chối giá trị trống theo đúng hợp đồng;
- **381 kiểm thử cũ** cộng các kiểm thử mới đều đạt;
- giao diện và desktop vẫn chạy đúng với backend mới;
- checkpoint ba workflow có EVIDENCE và đề xuất trạng thái.

Không có workflow mới, không có điểm giao tiếp mới, không đổi nhãn nào.

**Không thuộc phiên này:** BE-4 (tệp `data.db.lock` khi sao lưu và khôi phục). Việc đó chờ tới lúc làm `backup_data` và `restore_data` ở chặng E và F.

## BỐI CẢNH — vì sao có việc này

Chi tiết ở các mục changelog `v7.0.0` và `v8.0.0` đầu `data_schema.yaml`. Tóm tắt:
- Phiên giao diện 16 phát hiện backend nhận tên khách chỉ gồm dấu cách, và liên hệ có ô rỗng.
- Lúc lập plan phiên này, Orchestrator thấy cùng chỗ hở ở tiêu đề đơn hàng và bút danh.
- Nếu luật chỉ nằm ở giao diện, dữ liệu rác vẫn vào được qua mọi đường khác: công cụ kiểm thử, khôi phục một bản sao lưu cũ, các bên gọi sau này. Project Owner đã duyệt đưa luật vào hợp đồng (CT-2, CT-3, 2026-09-28).
- Giao diện đã áp dụng luật cho khách hàng ở phiên 17. Tiêu đề đơn hàng sẽ áp dụng ở chặng D2. Giao diện V1 **không có** màn hình hồ sơ bút danh. Backend là bên quyết định cuối cùng.
- Các trường tùy chọn (`string|null`) **không đổi** trong phiên này.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`: mục 5 (Backend) và mục 6;
   - `.plan/open_issues.md`: mục **BE-5**, **BE-6**, **CT-2**, **CT-3**;
   - hợp đồng:
     - `data_schema.yaml`: **các mục changelog `v7.0.0` và `v8.0.0`**; `clause_a_common.formats.not_blank`; `input_expected` và `status` của `manage_client`, `manage_commission`, `manage_watermark_profile`;
     - `api_contract.yaml`: ba workflow đó (không đổi);
   - checkpoint của ba workflow, ở đầu `services.py` của mỗi workflow: đọc hết;
   - code: `routers.py` của ba workflow (các model định dạng có `StringConstraints`), `entities.py`, và tệp kiểm thử trong `tests/` của từng workflow;
   - `Backend/tests/test_backend_process.py`: đã có một ca `display_name: ""` → 400;
   - plan này sau cùng.

   Xác nhận Data Schema **`8.0.0`**, API Contract **`4.0.0`**, cả hai `approved`, và ba workflow đang ở `đang_triển_khai`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Python (`Backend\env\Scripts\python.exe --version`).
   - Chạy toàn bộ kiểm thử **trước khi sửa gì**: `cd Backend; env\Scripts\python.exe -m pytest -q`. Phải đạt **381/381**; khác thì dừng lại và báo.
   - Chụp mốc `%APPDATA%\CommissionTracker`. Không kiểm thử nào được đụng vào đó.

2. **Áp dụng "not blank" ở Routers của ba workflow.**
   - **Vị trí:** đây là một ràng buộc của **kiểu** trong hợp đồng, nên nó là phép kiểm định dạng ở **Routers** (`04-implement.md`), cùng chỗ với `min_length`/`max_length` hiện có. Không đặt vào Services hay Adapters.
   - **Định nghĩa**, theo `formats.not_blank`: chuỗi còn **ít nhất một ký tự** sau khi bỏ khoảng trắng ở **hai đầu**. Dùng `str.strip()` không đối số của Python, tức khoảng trắng theo `str.isspace()`.
   - **Mỗi workflow tự có một hàm kiểm ngắn của riêng nó** (quyết định của Project Owner, 2026-09-28). Không tạo `Backend/shared/`, không import code giữa các workflow. Lý do: đây là tiền lệ sẵn có của dự án, vì mỗi workflow đã tự giữ `_ID_PATTERN` của mình dù cùng lấy từ `formats.id`. Một thư mục `shared/` đầu tiên chỉ để tiết kiệm vài dòng thì phá tiền lệ cấu trúc. Ba hàm phải có cùng định nghĩa; ghi rõ điều đó trong EXPERIENCES của từng workflow.
   - **Áp cho năm trường** ở bảng mục tiêu. `channel` và `value` cũng thành `1..` ký tự; not blank đã bao hàm điều đó.
   - **Giữ nguyên:**
     - các giới hạn độ dài hiện có (120, 200, 80 ký tự), đếm trên giá trị **gốc**, không phải giá trị đã bỏ khoảng trắng;
     - mọi trường `string|null` (`note`, `description`, `commission_type`, `legal_name`, `contact`, `ownership_statement`) và `reference_links` **không** thuộc luật này;
     - mọi luật `strict`/`extra="forbid"` hiện có.
   - **Lưu đúng như nhận:** giá trị hợp lệ được lưu và trả lại **nguyên văn**, không bỏ khoảng trắng. Ví dụ `"  An  "` được lưu là `"  An  "`. Hợp đồng ghi rõ: "It is a check only".
   - **Khi vi phạm:** `400` + `ERR_VALIDATION`, như mọi lỗi định dạng khác của input đó. `details` theo đúng hình dạng hiện có của workflow và phải chỉ ra trường vi phạm. Không thêm mã lỗi, không đổi nhãn.
   - **Thứ tự kiểm không đổi:** nếu endpoint hiện kiểm định dạng trước khi tra `client_id` hay `commission_id`, thì giữ nguyên thứ tự đó.
   - Cách hiện thực do bạn chọn, ví dụ `StringConstraints` kèm `AfterValidator`, hoặc `field_validator` của Pydantic. Yêu cầu: FastAPI không bao giờ tự trả `422`, như luật đang có ở đầu mỗi `routers.py`.

3. **Kiểm thử**, trong `tests/` của từng workflow, gọi qua HTTP như các ca hiện có.
   - **Với mỗi trường trong năm trường, trên cả endpoint tạo lẫn endpoint sửa của workflow đó**, đều trả 400 `ERR_VALIDATION`, `details` chỉ ra trường vi phạm, và **không ghi gì**:
     - chuỗi rỗng `""`;
     - chỉ khoảng trắng ASCII, ví dụ `"   "`, `"\t\n"`;
     - chỉ khoảng trắng Unicode: `" "` và `"　"`.

     Endpoint tạo và sửa lấy đúng theo `api_contract.yaml`.
   - **Không ghi gì** nghĩa là: sau lệnh tạo bị từ chối, danh sách không đổi; sau lệnh sửa bị từ chối, lệnh đọc trả đúng dữ liệu cũ.
   - **Ca hợp lệ, cho mỗi workflow:**
     - giá trị có khoảng trắng ở hai đầu → thành công, và lưu **nguyên văn** (đọc lại để kiểm);
     - giá trị dài đúng giới hạn, có dấu tiếng Việt → thành công;
     - một trường tùy chọn là `"   "` (ví dụ `note`, `description`, `legal_name`) → thành công, lưu nguyên văn, vì trường tùy chọn không thuộc luật;
     - `contacts: []` → thành công (`manage_client`).
   - **Ca biên:** giá trị dài đúng giới hạn, **cộng** khoảng trắng hai đầu → 400, vì độ dài đếm trên giá trị gốc. Project Owner đã xác nhận giữ cách đọc này (2026-09-28): giao diện tự bỏ khoảng trắng trước khi gửi, nên họa sĩ không gặp ca này. Ghi rõ đây là hành vi theo hợp đồng.
   - **Kiểm thử của workflow khác vẫn đạt.** Ví dụ `update_progress`, `record_payment`, `view_income_report`, `send_reminder` tạo khách và đơn trong kiểm thử của chúng. Nếu một kiểm thử cũ đang dùng tên hay tiêu đề trống làm dữ liệu mẫu hợp lệ, **dừng lại và báo**; không tự sửa kiểm thử của workflow ngoài ba workflow này.
   - **Chứng minh kiểm thử cắn:** tạm bỏ phép kiểm not blank ở từng workflow. Các ca "chỉ khoảng trắng" của workflow đó phải **hỏng**. Ghi số ca hỏng, rồi khôi phục.

4. **Checkpoint của ba workflow** (Giao thức 07):
   - Cập nhật các chỗ trích hợp đồng lên Data Schema 8.0.0.
   - Thêm EXPERIENCES:
     - định nghĩa khoảng trắng đã dùng (`str.isspace`);
     - "lưu nguyên văn", và vì sao;
     - độ dài đếm trên giá trị gốc;
     - mỗi workflow tự có hàm kiểm, giống hệt nhau, theo quyết định của Project Owner (việc 2).
   - Thêm EVIDENCE: lệnh chạy, số ca, bằng chứng cắn.
   - **Giới hạn đã biết**, ghi vào EXPERIENCES, không đòi vá ở V1:
     - `str.strip()` của Python và `String.prototype.trim` của JavaScript khác nhau ở vài ký tự hiếm. Python coi `\x1c`–`\x1f` là khoảng trắng còn JS thì không; với `﻿` thì ngược lại. Backend là bên quyết định. Giao diện hiện thông báo 400 chung khi backend từ chối.
     - Ký tự vô hình không phải khoảng trắng (ví dụ `​`) vẫn qua được luật này. Hợp đồng không cấm.
   - **Đề xuất trạng thái:** mỗi checkpoint ghi một NOTE đề xuất workflow đó chuyển `đang_triển_khai` → `đã_hoàn_thiện` (Giai đoạn 6). Không tự sửa hợp đồng.

5. **Chạy toàn bộ trên Windows:**
   - `cd Backend; env\Scripts\python.exe -m pytest -q`: **381 + số ca mới**, đều đạt;
   - `cd Desktop; npm test`: đạt đủ, dùng backend thật;
   - `cd UI; npm run e2e`: 17/17. Giao diện không bao giờ gửi giá trị trống, nên không có gì đổi hành vi;
   - chụp lại mốc `%APPDATA%`: phải giống mốc ở việc 1.

   Không cần chạy `npm run dist`, vì phiên này không đổi phụ thuộc hay Main.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `formats.not_blank`, nguyên văn: *"Constraint written in a string type as (not blank): the string still has at least one character after its leading and trailing whitespace is removed. It is a check only: the value is stored and returned exactly as given."*
- Kiểu input sau khi sửa (Data Schema 8.0.0):
  - `client_input`: `display_name: string (1..120 characters, not blank)`; `contacts: list[object { channel: string (1.. characters, not blank; …), value: string (1.. characters, not blank) }]`; `note: string|null`;
  - `commission_input`: `title: string (1..200 characters, not blank)`; các trường khác không đổi;
  - `profile_input`: `display_name: string (pen name, 1..80 characters, not blank)`; các trường khác không đổi.
- Nhãn không đổi (API Contract 4.0.0). Vi phạm → `400 ERR_VALIDATION`.
- Dữ liệu đã lưu **không** được chuyển đổi hay sửa: luật chỉ áp khi ghi.
- Hình dạng output (`client_detail`, `commission_detail`, các bản ghi `*_record`…) không đổi.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Chỉ sửa `Backend/workflows/manage_client/`, `Backend/workflows/manage_commission/`, `Backend/workflows/manage_watermark_profile/` (code, kiểm thử, checkpoint), Không tạo `Backend/shared/`.
- Không sửa Main (`Backend.py`), `scaffold_backend`, hay workflow nào khác, kể cả kiểm thử của chúng.
- Không sửa tệp nào ngoài `Backend/`. Được **chạy** các lệnh của `Desktop/` và `UI/`, không sửa tệp nào ở đó.
- Không bỏ khoảng trắng khỏi giá trị trước khi lưu.
- Không áp luật not blank cho trường nào ngoài năm trường ở bảng mục tiêu.
- Không đổi `details` sang hình dạng mới.
- Không làm BE-4.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không kiểm thử nào đụng `%APPDATA%\CommissionTracker` thật. Không tắt hay đổi cấu hình antivirus.
- Không khuyến khích dùng sub-agent.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên Windows:

1. Endpoint tạo và sửa của ba workflow trả `400 ERR_VALIDATION` cho năm trường khi trống theo `formats.not_blank`. `details` chỉ ra trường vi phạm, và không có gì được ghi.
2. Giá trị hợp lệ có khoảng trắng hai đầu được lưu và trả lại nguyên văn. Các trường tùy chọn không bị ảnh hưởng.
3. Có đủ các ca kiểm thử ở việc 3 cho cả ba workflow, và có bằng chứng kiểm thử cắn cho từng workflow.
4. `pytest`: 381 + số ca mới, đều đạt, không sửa kiểm thử của workflow khác. Desktop `npm test` đạt. UI `npm run e2e` 17/17.
5. Checkpoint ba workflow theo Giao thức 07: EXPERIENCES, EVIDENCE, giới hạn đã biết, và NOTE đề xuất `đã_hoàn_thiện`. Không `UNSOLVED_PROBLEMS`, trừ khi có ghi rõ.
6. Mốc `%APPDATA%` không đổi.
7. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm các lệnh để Project Owner tự chạy lại.
