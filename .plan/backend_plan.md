# ===WCA-PLAN===
# session_for: backend
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-09-30T22:30:00+07:00
# contract: data_schema 9.0.0, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 23 của dự án, phiên backend thứ mười hai. Đây là **phiên ngắn, một việc: BE-7**. Workflow `record_payment` áp luật "not blank" (`formats.not_blank`) mà Data Schema 9.0.0 (CT-4) đã thêm cho **một trường**:

| Mục | Workflow | Trường | Endpoint nhận trường này | Hợp đồng |
|---|---|---|---|---|
| **BE-7** | `record_payment` | `payment_input.method` | chỉ `record` (`POST /payments`); workflow không có endpoint sửa khoản | 9.0.0 (CT-4) |

`record_payment` đang ở `đang_triển_khai`. Cuối phiên, đề xuất đưa về `đã_hoàn_thiện`.

**Điểm dừng:**
- `method` trống bị từ chối theo đúng hợp đồng;
- **445 kiểm thử cũ** (trừ đúng một ca phải viết lại, xem việc 3) cộng các ca mới đều đạt;
- desktop và giao diện vẫn chạy đúng với backend mới;
- checkpoint `record_payment` có EVIDENCE và NOTE đề xuất trạng thái.

Không có workflow mới, không có điểm giao tiếp mới, không đổi nhãn nào.

## BỐI CẢNH — vì sao có việc này

Chi tiết ở các mục changelog `v9.0.0` đầu `data_schema.yaml` và mục **CT-4**, **BE-7** của `.plan/open_issues.md`. Tóm tắt:
- Lúc làm I1 cho chặng D4 (thanh toán), Orchestrator thấy `method` là chuỗi bắt buộc nhưng hợp đồng không cấm trống. Backend kiểm `method: str`, nên nhận `""` và `"   "`: một khoản tiền không biết đã nhận qua đâu.
- Project Owner duyệt CT-4 ngày 2026-09-30 (Data Schema 9.0.0). Giao diện đã chặn phương thức trống ở phiên 22. Backend là bên quyết định cuối cùng: dữ liệu rác vẫn vào được qua mọi đường khác (công cụ kiểm thử, khôi phục bản sao lưu, bên gọi sau này).
- Đây là việc **giống hệt BE-5 và BE-6** của phiên 18, đã audit đạt. Ba workflow `manage_client`, `manage_commission`, `manage_watermark_profile` là mẫu để làm theo.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`: mục 5 (Backend) và mục 6;
   - `.plan/open_issues.md`: mục **BE-7**, **CT-4**;
   - hợp đồng:
     - `data_schema.yaml`: **các mục changelog `v9.0.0`**; `clause_a_common.formats.not_blank`; `input_expected.payment_input` và `status` của `record_payment`;
     - `api_contract.yaml`: `record_payment` (không đổi);
   - checkpoint của `record_payment`, ở đầu `services.py` và các tệp khác của workflow: đọc hết;
   - code:
     - `Backend/workflows/record_payment/routers.py` (`_PaymentInputFormat`, `_validation_details`), `entities.py`, `tests/test_record_payment.py`;
     - **mẫu đã audit đạt:** hàm `_not_blank` và cách gắn nó trong `Backend/workflows/manage_commission/routers.py`, cùng các ca not blank trong `manage_commission/tests/`;
   - plan này sau cùng.

   Xác nhận Data Schema **`9.0.0`**, API Contract **`4.0.0`**, cả hai `approved`, và `record_payment` đang ở `đang_triển_khai`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Python (`Backend\env\Scripts\python.exe --version`).
   - Chạy toàn bộ kiểm thử **trước khi sửa gì**: `cd Backend; env\Scripts\python.exe -m pytest -q`. Phải đạt **445/445**; khác thì dừng lại và báo.
   - Chụp mốc `%APPDATA%\CommissionTracker` (tồn tại hay không; nếu có: kích thước và SHA-256 của `data.db`, thời điểm ghi). Không kiểm thử nào được đụng vào đó.
   - `git status --short`: ghi lại.

2. **Áp dụng "not blank" cho `method` ở Routers của `record_payment`.**
   - **Vị trí:** ràng buộc của **kiểu** trong hợp đồng, nên nó là phép kiểm định dạng ở **Routers** (`04-implement.md`), trong `_PaymentInputFormat`. Không đặt vào Services hay Adapters.
   - **Cách làm, theo đúng mẫu phiên 18:** `method: Annotated[str, StringConstraints(min_length=1), AfterValidator(_not_blank)]`, với `_not_blank` là **hàm riêng của `record_payment`**, cùng định nghĩa với ba workflow kia. Không tạo `Backend/shared/`, không import code từ workflow khác (quyết định của Project Owner, 2026-09-28).
   - **Định nghĩa**, theo `formats.not_blank`: chuỗi còn ít nhất một ký tự sau khi bỏ khoảng trắng ở hai đầu, bằng `str.strip()` không đối số (khoảng trắng theo `str.isspace()`).
   - **Giữ nguyên:**
     - hợp đồng không đặt độ dài tối đa cho `method`: không thêm;
     - `note` (`string|null`) **không** thuộc luật này;
     - `strict=True`, `extra="forbid"` và mọi phép kiểm hiện có (`amount_minor > 0`, `currency`, `paid_at`).
   - **Lưu đúng như nhận:** giá trị hợp lệ được lưu và trả lại **nguyên văn**, không bỏ khoảng trắng. `" MoMo "` được lưu là `" MoMo "`.
   - **Khi vi phạm:** `400` + `ERR_VALIDATION`, như mọi lỗi định dạng khác của `record`. `details` giữ hình dạng hiện có (`errors[].loc`, `errors[].msg`), và `loc` phải là `["payment_input", "method"]`. Không thêm mã lỗi, không đổi nhãn.
   - **Thứ tự kiểm không đổi:** `record` kiểm định dạng trước khi tra `commission_id`. Một `method` trống kèm `commission_id` không tồn tại vẫn là 400, không phải 404.
   - FastAPI không bao giờ được tự trả `422`, như luật đang có ở đầu `routers.py`.

3. **Kiểm thử**, trong `Backend/workflows/record_payment/tests/`, gọi qua HTTP như các ca hiện có.
   - ⚠ **Một ca cũ trái với hợp đồng mới, phải viết lại:** `test_method_is_free_text` hiện khẳng định `record(http, mid, method="")` trả 201. Theo Data Schema 9.0.0, ca này phải thành **400**.
     - Giữ phần khẳng định `"Ví MoMo 🙂"` được lưu nguyên văn.
     - Chuyển phần `""` sang các ca bị từ chối bên dưới.
     - Ghi rõ trong báo cáo: tên ca, dòng cũ, dòng mới, lý do (Data Schema 9.0.0). Đây là ca **duy nhất** được sửa; sửa ca cũ nào khác thì dừng lại và báo.
   - **Ca bị từ chối**, mỗi ca trả 400 `ERR_VALIDATION`, `loc` là `["payment_input", "method"]`, và **không ghi gì** (sau lệnh bị từ chối, `GET /payments?commission_id=…` không đổi và số dư không đổi):
     - chuỗi rỗng `""`;
     - chỉ khoảng trắng ASCII: `"   "`, `"\t\n"`;
     - chỉ khoảng trắng Unicode: `" "` và `"　"`;
     - `method` trống kèm `commission_id` không tồn tại → vẫn 400 (thứ tự kiểm).
   - **Ca hợp lệ:**
     - `" MoMo "` → 201, lưu và trả lại nguyên văn (đọc lại qua `GET /payments` để kiểm);
     - `"Chuyển khoản"` có dấu tiếng Việt → 201;
     - `note: "   "` → 201, lưu nguyên văn, vì `note` không thuộc luật;
     - `note: null` → 201.
   - **Kiểm thử của workflow khác vẫn đạt, không sửa.** `view_income_report` tạo khoản thanh toán trong kiểm thử của nó (hiện dùng `"cash"`). Nếu một kiểm thử ngoài `record_payment` hỏng vì luật mới, **dừng lại và báo**.
   - **Chứng minh kiểm thử cắn:** tạm bỏ `AfterValidator(_not_blank)`. Các ca "chỉ khoảng trắng" phải **hỏng**. Ghi số ca hỏng, rồi khôi phục và chạy lại cho đạt.
     - Nếu công cụ phân quyền của bạn chặn bước này thì không tìm cách vòng: khôi phục ngay, ghi lại, Orchestrator sẽ tự làm.

4. **Checkpoint của `record_payment`** (Giao thức 07):
   - Cập nhật các chỗ trích hợp đồng lên Data Schema 9.0.0.
   - Thêm EXPERIENCES:
     - định nghĩa khoảng trắng đã dùng (`str.isspace`);
     - "lưu nguyên văn", và vì sao;
     - hàm kiểm riêng của workflow, giống hệt ba workflow đã làm ở phiên 18, theo quyết định của Project Owner;
     - ca `test_method_is_free_text` đã viết lại, vì sao.
   - Thêm EVIDENCE: lệnh chạy, số ca, bằng chứng cắn.
   - **Giới hạn đã biết**, ghi vào EXPERIENCES, không đòi vá ở V1:
     - `str.strip()` của Python và `String.prototype.trim` của JavaScript khác nhau ở vài ký tự hiếm (`\x1c`–`\x1f`; `﻿`). Backend là bên quyết định;
     - ký tự vô hình không phải khoảng trắng (ví dụ `​`) vẫn qua được luật; hợp đồng không cấm;
     - **dữ liệu cũ không bị chuyển đổi:** khoản đã ghi trước phiên này với `method` trống vẫn còn nguyên và vẫn được đọc, liệt kê, tính số dư, hủy bình thường. Luật chỉ áp khi ghi.
   - **Đề xuất trạng thái:** NOTE đề xuất `record_payment` chuyển `đang_triển_khai` → `đã_hoàn_thiện` (Giai đoạn 6). Không tự sửa hợp đồng.

5. **Chạy toàn bộ trên Windows:**
   - `cd Backend; env\Scripts\python.exe -m pytest -q`: **445 + số ca mới**, đều đạt;
   - `cd Desktop; npm test`: đạt đủ, dùng backend thật;
   - `cd UI; npm run e2e`: **54/54**, **không** đặt `CT_WALKTHROUGH_RUNNER`. Giao diện không bao giờ gửi phương thức trống, nên hành vi không đổi. Sau đó `git status --short UI/evidence` phải trống. Lần hỏng chỉ vì chụp ảnh hết giờ (UI-11) thì ghi tên bước, chạy lại, và không tính;
   - chụp lại mốc `%APPDATA%`: phải giống mốc ở việc 1.

   Không cần chạy `npm run dist`, vì phiên này không đổi phụ thuộc hay Main.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `formats.not_blank`, nguyên văn: *"Constraint written in a string type as (not blank): the string still has at least one character after its leading and trailing whitespace is removed. It is a check only: the value is stored and returned exactly as given."*
- `payment_input.method` (Data Schema 9.0.0): `string (1.. characters, not blank; free label, …)`. `note`: `string|null`, không đổi.
- Nhãn của `record` không đổi (API Contract 4.0.0): 201, 400 `ERR_VALIDATION`, 404, 409, 422, 500.
- Dữ liệu đã lưu **không** được chuyển đổi hay sửa.
- Hình dạng output (`payment_record`, `payment_list`, `commission_balance`, `payment_ledger`) không đổi.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Chỉ sửa `Backend/workflows/record_payment/` (code, kiểm thử, checkpoint). Không tạo `Backend/shared/`.
- Không sửa Main (`Backend.py`), `scaffold_backend`, hay workflow nào khác, kể cả kiểm thử của chúng.
- Không sửa tệp nào ngoài `Backend/`. Được **chạy** các lệnh của `Desktop/` và `UI/`, không sửa tệp nào ở đó. Nếu `npm run e2e` làm đổi `UI/evidence/`, báo lại, không tự khôi phục bằng git.
- Không bỏ khoảng trắng khỏi giá trị trước khi lưu. Không áp luật cho `note` hay trường nào khác.
- Không viết code chuyển đổi dữ liệu cũ.
- Không đổi `details` sang hình dạng mới.
- Không làm BE-4.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không chạy lệnh git nào đổi trạng thái kho (commit, push, reset, checkout, restore, stash).
- Không kiểm thử nào đụng `%APPDATA%\CommissionTracker` thật. Không tắt hay đổi cấu hình antivirus.
- Không tắt luật lint, không thêm `eslint-disable` hay `# noqa` mới.
- Không dùng sub-agent.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên Windows:

1. `POST /payments` trả `400 ERR_VALIDATION` khi `method` trống theo `formats.not_blank`; `loc` là `["payment_input", "method"]`; không có gì được ghi; thứ tự kiểm không đổi.
2. `method` hợp lệ có khoảng trắng hai đầu được lưu và trả lại nguyên văn. `note` không bị ảnh hưởng.
3. Có đủ các ca ở việc 3, có bằng chứng kiểm thử cắn (hoặc ghi rõ bị công cụ chặn), và chỉ đúng một ca cũ được viết lại.
4. `pytest`: 445 + số ca mới, đều đạt, không sửa kiểm thử của workflow khác. Desktop `npm test` đạt. UI `npm run e2e` 54/54; `UI/evidence` không đổi.
5. Checkpoint `record_payment` theo Giao thức 07: EXPERIENCES, EVIDENCE, giới hạn đã biết, NOTE đề xuất `đã_hoàn_thiện`. Không `UNSOLVED_PROBLEMS`, trừ khi có ghi rõ.
6. Mốc `%APPDATA%` không đổi.
7. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm các lệnh để Project Owner tự chạy lại và danh sách tệp trong `git status --short`.
