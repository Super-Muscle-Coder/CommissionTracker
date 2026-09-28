# Audit phiên backend #9 (B0) — `coding-agent@2026-09-26#1`

*Orchestrator, 2026-09-26. Theo `08-operating-protocol.md`, Phần 5.*

## Kết luận

Công việc thật, đúng phạm vi, đạt đủ tiêu chí hoàn tất của plan. Báo cáo trung thực: mọi con số tôi chạy lại đều khớp.

**Một chỗ lệch nhỏ với chữ của hợp đồng (P1, dưới đây).** Nó không phải lỗ hổng, và không chặn B1. Nhưng hoặc hợp đồng, hoặc code phải đổi cho khớp; người vận hành quyết định.

Kết quả chạy lại và đối chiếu:

- **Toàn bộ kiểm thử:** chạy lại độc lập trên Linux, Python 3.13.13, đúng các phiên bản gói trong `requirements.txt`: **375/375 đạt** (361 cũ + 14 mới), khớp checkpoint của Main.
- **Lệnh EVIDENCE CORS**, chọn 10 hàm theo node ID: **14 passed**, khớp đúng mục EVIDENCE.
- **Không mất kiểm thử cũ nào.** Số kiểm thử của từng tệp khớp EVIDENCE cấp workflow đã ghi từ các phiên trước:
  - manage_client + manage_commission 93;
  - manage_watermark_profile 33;
  - record_payment 69;
  - send_reminder 67;
  - update_progress 38;
  - view_income_report 29;
  - scaffold_backend 5;
  - kiểm thử vòng đời tiến trình 27.
- **Những thứ không bị đụng tới.** Hợp đồng, `CLAUDE.md` và plan trên máy giống hệt từng byte bản Orchestrator đã giao. Những thứ sau không có tệp nào đổi (xác nhận qua thời điểm sửa đổi):
  - `CommissionTracker.slnx`, `.reviews/`, `Desktop/`, `UI/`;
  - `requirements.txt` và mọi tệp code của workflow.
- **Checkpoint:** chín khối parse được bằng YAML. Toàn layer không có `UNSOLVED_PROBLEMS`.
- **`Backend.pyproj`** khớp đúng thư mục thật: 69 mục, 69 tệp.

## Đối chiếu với plan

| Việc | Kết quả |
|---|---|
| 1. `ui_origin` ở `configs/backend.yaml`, đúng giá trị hợp đồng, có ghi chú `shared_values.ui_origin` | Khớp |
| 1. Code Python không chứa origin (chỉ có trong chú thích checkpoint) | Khớp |
| 2. CORS gắn trong `create_http_app`; `main()` và mọi kiểm thử đi qua đúng hàm này | Khớp — `create_http_app(layer_cfg)`, 19 lời gọi trong 8 tệp kiểm thử |
| 2. Một origin; không `*`, không regex; không credentials; không route `OPTIONS`; không thêm gói phụ thuộc | Khớp |
| 2. Phản hồi lỗi đã khai báo mang header CORS | Khớp |
| 3. Đủ các ca bắt buộc, trong đó có một ca qua tiến trình `Backend.py` thật | Khớp |
| 4. EVIDENCE toàn layer, EVIDENCE CORS theo node ID, `main-EXP-010` ghi giới hạn 500 thô đã kiểm thật | Khớp |
| 4. Giữ NOTE stdin-pipe và hai NOTE đã chấp nhận | Khớp |
| 5. `Backend.pyproj`: thêm `tests\test_cors.py`, không sửa gì khác | Khớp |

Agent khai một chỗ lệch thứ tự: đọc plan trước checkpoint của Main. Việc này vô hại, vì agent đọc checkpoint trước khi ra quyết định nào.

## Tôi kiểm lại độc lập

**Kiểm thử có cắn không.** Tôi tạo sáu đột biến trên một bản sao của `Backend.py`, rồi chạy `tests/test_cors.py` với từng đột biến:

| Đột biến | Kiểm thử hỏng |
|---|---|
| Gỡ middleware CORS | 7/14 |
| `allow_origins=["*"]` | 9/14 |
| Thêm origin `null` | 1/14 |
| `allow_methods=["*"]` | 4/14 |
| `allow_credentials=True` | 7/14 |
| `allow_headers=["*"]` | 1/14 |

Không đột biến nào lọt qua.

**Preflight cho mọi địa chỉ đã khai báo, không chỉ ba địa chỉ trong kiểm thử.** Tôi đọc `api_contract.yaml`, lấy đủ 38 địa chỉ `http`, và gửi preflight từ `ui_origin` với đúng method của từng địa chỉ. Kết quả: 38/38 trả 200 kèm `Access-Control-Allow-Origin`. Hợp đồng chỉ dùng `GET`, `POST`, `PUT`, khớp cấu hình.

**Nhãn 422**, loại nhãn lỗi duy nhất mà kiểm thử của agent không phủ: `POST /payments` sai tiền tệ trả `422 ERR_CURRENCY_MISMATCH` và có `Access-Control-Allow-Origin`. Kết quả này đúng như dự đoán, vì mọi nhãn lỗi đi cùng một đường.

**Origin gần giống.** `APP://commission-tracker` (hoa) và `app://commission-tracker/` (thừa dấu `/`) đều không được cấp gì. So khớp là so chính xác từng ký tự; đây là hành vi đúng.

**Giới hạn 500 thô:** tôi xác nhận đúng như `main-EXP-010` mô tả, bằng cả kiểm thử của agent lẫn đọc thứ tự middleware của Starlette.

## Phát hiện

### P1 — Preflight từ origin lạ vẫn nhận ba header CORS

Hợp đồng (`clause_a_common.mandatory_rules`, luật CORS) ghi: *"a request from any other origin receives no CORS headers"*.

**Thực tế.** Preflight từ origin khác bị từ chối (`400 Disallowed CORS origin`, không có `Access-Control-Allow-Origin`), nhưng vẫn mang ba header CORS:

- `Access-Control-Allow-Methods: GET, POST, PUT`;
- `Access-Control-Allow-Headers: …`;
- `Access-Control-Max-Age: 600`.

Đây là hành vi cố định của `CORSMiddleware` trong Starlette. Tôi đo được với cả bốn origin lạ đã thử. Yêu cầu thường (không phải preflight) từ origin lạ thì đúng là không có header nào.

**Mức độ: thấp.**
- Về an ninh: không có ảnh hưởng. Trình duyệt chỉ cho qua khi có `Access-Control-Allow-Origin` khớp, và ba header kia chỉ lộ danh sách method, header mà hợp đồng công khai sẵn.
- Về chữ của hợp đồng: code đang **lệch**.

**Kiểm thử và EVIDENCE không bắt được chỗ này.** Với yêu cầu thường, `test_other_origins_receive_no_cors_headers` kiểm "không có header `access-control-*` nào". Với preflight, nó chỉ kiểm "không có `Access-Control-Allow-Origin`". Trong khi đó, `claim` của mục EVIDENCE CORS lại viết "origin khác không nhận header CORS", tức là nói rộng hơn phần đã chứng minh.

Agent **không** tự bịa kết quả ở đây. Nhưng agent đã nới điều kiện kiểm cho preflight mà không nêu lý do trong báo cáo hay NOTES. Đây đúng là kiểu tự hợp lý hóa âm thầm mà audit phải bắt.

**Hai hướng xử lý, người vận hành chọn:**

- **(A) Làm rõ hợp đồng — tôi đề xuất hướng này.** Data Schema 6.0.1 (PATCH, [Clause A, SỬA]) viết lại vế sau của luật: *"a request from any other origin receives no Access-Control-Allow-Origin header, so the browser grants it nothing; the body of a refused preflight is not specified."*

  Lý do chọn: ý định của luật là "không cấp quyền", và điều đó đang đúng. Ưu tiên V1 là dạng đơn giản nhất mà chạy đúng. Sửa code để xóa ba header vô hại đòi một lớp bọc tự viết quanh middleware có sẵn: thêm code, thêm chỗ sai, không thêm an toàn.

  Nếu duyệt, phiên backend kế tiếp có một việc nhỏ: sửa `claim` của mục EVIDENCE CORS cho đúng phạm vi đã chứng minh. Không phải sửa code.
- **(B) Giữ nguyên chữ của hợp đồng, sửa code** để preflight bị từ chối không mang header `access-control-*` nào. Kiểm thử cho preflight phải siết theo.

### P2 — Thân phản hồi của preflight bị từ chối là văn bản thô, không phải `error_body` (ghi nhận, không cần sửa riêng)

Ví dụ: `400 text/plain "Disallowed CORS origin"`, hay `"Disallowed CORS method"` khi preflight từ `ui_origin` xin `DELETE`.

Hợp đồng đã nói preflight *"is not an endpoint"*, nên `endpoint_forms.http` với luật "body là output hoặc error_body" không áp cho nó. Trình duyệt cũng không bao giờ đưa thân của preflight cho code của renderer. Nếu chọn hướng (A) ở P1, câu "the body of a refused preflight is not specified" đóng luôn điểm này.

## Nhận xét về cách làm

- **Kiểm thử `test_allowed_methods_are_exactly_those_of_the_registered_routes`** không có trong plan, nhưng đáng giữ. Nó chặn một kiểu trôi lặng lẽ: sau này một workflow thêm method mới (ví dụ `DELETE` ở V2) mà quên cấu hình CORS. Khi đó kiểm thử hỏng ngay, thay vì renderer bị trình duyệt chặn mà không ai hiểu vì sao.
- **Đặt method và header trong `configs/backend.yaml`** thay vì viết trong code: đúng tinh thần "không gõ giá trị cấu hình vào code". Plan không yêu cầu, agent có khai.
- **Kiểm thử 500 `ERR_STORAGE_IO` đổi tên bảng `client`** ngay trong kiểm thử cấp layer. Việc này dùng lại tiền lệ `main-EXP-008`, và không có code workflow nào đọc bảng của workflow khác.
- **Tham số hóa `OTHER_ORIGINS` gọi `free_port()` lúc nạp module**, nên node ID của ca `http://127.0.0.1:<cổng>` đổi sau mỗi lần chạy. Không ảnh hưởng EVIDENCE, vì lệnh EVIDENCE chọn theo tên hàm, không theo tham số. Ghi lại để phiên sau đừng chọn theo node ID có tham số.
- **Giới hạn của audit này.** Tôi không có bản trước phiên của 8 tệp kiểm thử bị sửa, nên không so được từng byte. Bù lại, tôi kiểm theo ba cách:
  - đọc cả 19 lời gọi `create_http_app`: dạng giống hệt nhau, đều đọc `configs/backend.yaml`;
  - số kiểm thử từng tệp khớp EVIDENCE đã có;
  - toàn bộ vẫn đạt.

## Cho phiên B1

NOTE mới trong checkpoint của Main là đúng và cần thiết. B1 phải đo hai điều, vì kiểm thử ở đây chỉ mô phỏng header:

1. **Origin thật** mà trang nạp qua `app://` gửi tới backend. Nếu khác `shared_values.ui_origin`, sửa hợp đồng; phía backend chỉ đổi một dòng.
2. **Chromium có đòi thêm bước cho phép "Private / Local Network Access"** khi trang `app://` gọi `127.0.0.1` hay không. Tôi **không nắm chắc** hành vi này trong Electron 44 với một scheme tự đăng ký, và không đoán. Nếu có, backend hiện không trả header nào cho loại preflight đó. Khi ấy phải quay về hợp đồng, không vá ở desktop.

Hai điểm này sẽ vào plan B1 như những việc **bắt buộc đo**, kèm tiêu chí dừng.

## Đề xuất

- **`status`:** không đổi `status` của workflow nào. Phiên này chỉ làm Main.
- **B0: chấp nhận.** Phần backend của lát cắt dọc đã sẵn sàng cho B1.
- **P1:** chờ người vận hành chọn (A) hoặc (B). Không chặn B1: với cả hai hướng, renderer ở `ui_origin` đều chạy như nhau.
