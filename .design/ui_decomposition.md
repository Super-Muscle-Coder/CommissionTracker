# Phân rã giao diện (iWCA I1) — Commission Tracker V1

*Orchestrator + Project Owner, 2026-09-26. Đầu ra của Giai đoạn I1, skill `iwca-implementation` v1.0. Căn cứ: Data Schema 6.1.0, API Contract 4.0.0 (`approved`); phạm vi ở `.design/v1_scope.md`; thứ tự màn hình ở `.plan/v1_roadmap.md`, chặng D–F.*

Tài liệu bền, không ghi đè mỗi phiên. **Chỉ Orchestrator sửa tệp này**; coding agent chỉ đọc (xem `CLAUDE.md` mục 5, "Vận hành layer giao diện"). I1 được làm lại, tức là tệp này được cập nhật, trước mỗi phiên thêm trang mới.

Mức chi tiết hiện tại: bảng workflow, bảng loại trừ và bảng giá trị khởi động đã đủ cho **toàn bộ V1**. Riêng bảng trang, chỉ trang đầu tiên (`client_list`, phiên B2b) có danh sách thao tác chi tiết. Các trang khác được liệt kê để đối chiếu độ phủ; thao tác của chúng sẽ được chi tiết ở lần làm lại I1 ngay trước phiên của chúng.

---

## 1. Thực đơn — mọi lối vào có `external` trong `called_by` (Bước I1.1)

Bảng này sinh ra từ `api_contract.yaml` 4.0.0. Mỗi khi hợp đồng đổi phiên bản, đối chiếu lại bảng.

| Workflow hệ thống | Điểm giao tiếp | Hình thức, địa chỉ | Nhãn kết quả |
|---|---|---|---|
| `manage_client` | `create_client` | http `POST /clients` | 201, 400, 500 |
| | `list_clients` | http `GET /clients` | 200, 500 |
| | `get_client` | http `GET /clients/{client_id}` | 200, 404, 500 |
| | `edit_client` | http `PUT /clients/{client_id}` | 200, 400, 404, 500 |
| | `set_client_archived` | http `PUT /clients/{client_id}/archived` | 200, 400, 404, 500 |
| `manage_commission` | `create_commission` | http `POST /commissions` | 201, 400, 404, 409, 500 |
| | `list_commissions` | http `GET /commissions` | 200, 500 |
| | `get_commission` | http `GET /commissions/{commission_id}` | 200, 404, 500 |
| | `edit_commission` | http `PUT /commissions/{commission_id}` | 200, 400, 404, 409, 500 |
| | `list_currencies` | http `GET /currencies` | 200 |
| `update_progress` | `change_stage` | http `PUT /commissions/{commission_id}/stage` | 200, 400, 404, 409, 500 |
| | `get_stage` | http `GET /commissions/{commission_id}/stage` | 200, 404, 500 |
| | `get_stage_history` | http `GET /commissions/{commission_id}/stage/history` | 200, 404, 500 |
| | `get_board` | http `GET /progress/board` | 200, 500 |
| | `list_stages` | http `GET /progress/stages` | 200 |
| `record_payment` | `record` | http `POST /payments` | 201, 400, 404, 409, 422, 500 |
| | `list_for_commission` | http `GET /payments` | 200, 404, 500 |
| | `void_payment` | http `PUT /payments/{payment_id}/void` | 200, 404, 409, 500 |
| | `get_balance` | http `GET /payments/balance/{commission_id}` | 200, 404, 409, 500 |
| `view_income_report` | `get_income_report` | http `GET /reports/income` | 200, 400, 409, 500 |
| `send_reminder` | `get_settings` | http `GET /reminders/settings` | 200, 500 |
| | `edit_settings` | http `PUT /reminders/settings` | 200, 400, 500 |
| | `list_pending` | http `GET /reminders/pending` | 200, 500 |
| | `acknowledge` | http `PUT /reminders/{notification_id}/ack` | 200, 404, 500 |
| `backup_data` | `create_backup` | http `POST /backups` | 201, 400, 500 |
| `restore_data` (desktop) | `start_restore` | ipc `restore:start` | 200, 400, 404, 409, 424, 500, 503 |
| `native_dialogs` (cắt ngang, desktop) | `open_file`, `save_file`, `pick_folder` | ipc `dialog:open-file`, `dialog:save-file`, `dialog:pick-folder` | 200 |
| `manage_watermark_profile` | `create_profile`, `list_profiles`, `get_profile`, `edit_profile`, `list_strengths` | http `/watermark-profiles…`, `GET /watermark-strengths` | — (loại trừ, §4) |
| `apply_watermark` | `apply`, `list_artworks`, `get_artwork` | http `/artworks…` | — (loại trừ, §4) |
| `verify_watermark` | `verify` | http `POST /verifications` | — (loại trừ, §4) |

Quy định chung giao diện phải hiện thực hóa ở phía bên gọi (`clause_a_common`):
- mọi nhãn không phải 2xx mang `error_body`;
- mọi số nguyên nằm trong ±(2^53−1);
- dạng `timestamp`, `date`, `id` theo `formats`;
- địa chỉ backend chỉ nhận qua bridge (§3);
- lời gọi `ipc` chỉ đi qua `invoke` của bridge (`endpoint_forms.ipc`).

## 2. Workflow giao diện (Bước I1.3, I1.4)

Mặc định của iWCA: mỗi workflow hệ thống mà giao diện dùng có đúng một workflow giao diện đối ứng, mang cùng tên.

| Workflow giao diện | Loại | Đối ứng | Quyết định trình bày chính | Dùng lần đầu ở |
|---|---|---|---|---|
| `scaffold_ui` | `nền_tảng` | — | Không có quyết định. Chuẩn bị tài nguyên `http_client` từ `backendBaseUrl`; về sau thêm tài nguyên `ipc_bridge` từ `invoke`, khi có lối vào `ipc` đầu tiên. | B2a |
| `manage_client` | `nghiệp_vụ` | `manage_client` | Sắp danh sách khách hàng theo thứ tự chữ cái tiếng Việt (backend trả theo `casefold`, nên "Ánh" đứng sau "z"); tách khách đang hoạt động và khách đã lưu trữ; chọn câu thông báo cho từng nhãn lỗi. **Từ D1:** kiểm dữ liệu form trước khi gửi (§5, trang `client_form`); định dạng ngày giờ để hiển thị. | B2b, D1 |
| `manage_commission` | `nghiệp_vụ` | `manage_commission` | Ghép tên khách hàng vào danh sách đơn. Adapters của workflow này gọi luôn `GET /clients`: đây là trùng lặp có chủ đích theo I1.3, không đi qua `manage_client` của giao diện. Cũng lo định dạng tiền theo `currency_code`. | D2 |
| `update_progress` | `nghiệp_vụ` | `update_progress` | Nhóm bảng tiến độ theo giai đoạn, theo thứ tự của `list_stages`. | D3 |
| `record_payment` | `nghiệp_vụ` | `record_payment` | Trình bày số dư và các khoản đã hủy. | D4 |
| `view_income_report` | `nghiệp_vụ` | `view_income_report` | Trình bày báo cáo theo tháng và theo tiền tệ. Không quy đổi tiền tệ (hợp đồng). | D5 |
| `send_reminder` | `nghiệp_vụ` | `send_reminder` | Trình bày danh sách nhắc việc đang chờ và phần cài đặt. | D6 |
| `backup_data` | `nghiệp_vụ` | `backup_data` | Để chi tiết ở lần làm lại I1 trước chặng E. | E |
| `restore_data` | `nghiệp_vụ` | `restore_data` (desktop, `ipc`) | Để chi tiết ở lần làm lại I1 trước chặng F. | F |

**`native_dialogs`** là hạ tầng cắt ngang của desktop. Workflow giao diện nào cần chọn tệp (`backup_data`, `restore_data`) sẽ gọi nó qua Adapters của chính mình, dùng tài nguyên `ipc_bridge`. Chi tiết sẽ làm ở lần làm lại I1 trước chặng E.

## 3. Giá trị khởi động (Bước I1.4)

| Giá trị | Là gì, định dạng | Trao bằng cách nào | Căn cứ trong hợp đồng |
|---|---|---|---|
| `backendBaseUrl` | Chuỗi `http://<loopback_host>:<port>`, ví dụ `http://127.0.0.1:51062`; cổng do desktop Main chọn lúc chạy | Thuộc tính của đối tượng đóng băng `window.<renderer_bridge>` (`window.commissionTracker`), do preload của desktop đặt trước khi code renderer chạy. **Chỉ Main của UI đọc nó** (R12). | Data Schema 6.1.0: `clause_a_common.mandatory_rules` (luật renderer), `shared_values.renderer_bridge`, `shared_values.loopback_host`. Đã đo thật ở B1 (`.reviews/audits/desktop/audit_desktop_session10.md`). |
| `invoke` (về sau) | Hàm `invoke(address, argument)`, trả `{ status, body }` | Cùng đối tượng bridge. Chỉ có mặt khi desktop đã triển khai ít nhất một lối vào `ipc`. **Chưa có ở B2.** | Data Schema 6.1.0 (luật renderer); API Contract 4.0.0, `endpoint_forms.ipc`. |

⚠ Main của UI phải kiểm định dạng `backendBaseUrl`: là chuỗi, đúng dạng `http://127.0.0.1:<1..65535>`. Nếu thiếu bridge, thiếu thuộc tính, hoặc sai dạng, Main hiện màn hình lỗi khởi động và dừng (iWCA I2.6, bước 1). Nhánh này được chứng minh bằng kiểm thử dựng Main trong jsdom (không có bridge, bridge thiếu thuộc tính, `backendBaseUrl` sai dạng). Không dùng `file://` để thử: hợp đồng không bao giờ nạp renderer từ `file://`, và module script của bản build vốn không chạy được ở đó.

## 4. Loại trừ có chủ đích (Bước I1.2)

| Lối vào | Lý do không dùng ở V1 |
|---|---|
| Mọi điểm giao tiếp của `manage_watermark_profile` (`/watermark-profiles…`, `GET /watermark-strengths`) | ⚠ **Không có màn hình hồ sơ quyền sở hữu ở V1** (`.design/v1_scope.md`, mục 3.1). Endpoint đang chạy thật nhưng tính năng nhúng chưa có. Họa sĩ điền thông tin cho một tính năng không tồn tại là niềm tin sai do chính ứng dụng tạo ra. Không workflow giao diện, không trang, không lời gọi nào tới các địa chỉ này. |
| Mọi điểm giao tiếp của `apply_watermark`, `verify_watermark` | Watermark thuộc V4 trở đi (`product_versions.md`; `v1_scope` mục 3.1). Backend chưa ráp nối các workflow này. |
| `send_reminder.check_due` (`POST /reminders/checks`) | Không có `external` trong `called_by`: chỉ `reminder_ticker` của desktop gọi. Có mặt ở đây để không ai tưởng là còn sót. |
| `backup_data.prepare_restore` | Chỉ `restore_data` của desktop gọi. |

## 5. Trang và layout (Bước I1.5)

Layout: `main_layout` (khung chính có điều hướng) — layout duy nhất. **Từ D1:** `main_layout` có một vùng điều hướng cố định, liệt kê các mục cấp cao nhất; hiện chỉ có mục "Khách hàng" (mở `client_list`). Mỗi phiên sau thêm mục của mình vào đúng vùng này, không đổi vị trí các mục cũ (§7.2, nguyên tắc 7). Màn hình lỗi khởi động không phải layout và không phải đích điều hướng: Main dựng thẳng component kit `FatalMessage` khi giá trị khởi động hỏng, trước khi có trang nào (iWCA I2.6, bước 1).

| Trang (khóa điều hướng) | Mục đích | Workflow giao diện dùng Routers | Layout | Trạng thái |
|---|---|---|---|---|
| `client_list` | Xem danh sách khách hàng; lối vào thêm khách và xem chi tiết | `manage_client` | `main_layout` | `hoàn_tất` (2026-09-28: phiên 16 và 17, audit phiên 17 đạt, Project Owner tự chạy tay. Trước đó `hoàn_tất` ngày 2026-09-27 với phạm vi chỉ đọc) |
| `client_detail` | Xem một khách hàng; lưu trữ, bỏ lưu trữ; lối vào sửa | `manage_client` | `main_layout` | `hoàn_tất` (2026-09-28: phiên 16 và 17, audit phiên 17 đạt, Project Owner tự chạy tay) |
| `client_form` | Thêm khách hàng mới, hoặc sửa một khách hàng | `manage_client` | `main_layout` | `hoàn_tất` (2026-09-28: phiên 16 và 17, audit phiên 17 đạt, Project Owner tự chạy tay) |
| *(D2)* danh sách, chi tiết, form đơn hàng | — | `manage_commission` | `main_layout` | `chưa_làm` |
| *(D3)* bảng tiến độ, lịch sử giai đoạn | — | `update_progress` | `main_layout` | `chưa_làm` |
| *(D4)* thanh toán của một đơn | — | `record_payment` | `main_layout` | `chưa_làm` |
| *(D5)* báo cáo thu nhập | — | `view_income_report` | `main_layout` | `chưa_làm` |
| *(D6)* nhắc việc | — | `send_reminder` | `main_layout` | `chưa_làm` |
| *(E, F)* sao lưu, khôi phục | — | `backup_data`, `restore_data` | `main_layout` | `chưa_làm` |

**Chi tiết trang `client_list`** (phiên B2b):
- **Thao tác duy nhất:** tải danh sách khi mở trang, và tải lại khi người dùng bấm nút tải lại. Dùng `list_clients` (`GET /clients`). Không có dữ liệu nhập, nên luật phủ của kịch bản bấm thử không đòi `rejected_input`.
- **Những gì phải hiện:** danh sách tên khách hàng, sắp theo chữ cái tiếng Việt. Danh sách rỗng hiện trạng thái rỗng, không hiện như lỗi. Khách đã lưu trữ được đánh dấu hoặc tách riêng (quyết định trình bày của `manage_client`).
- **Nhãn kết quả phải xử lý:** 200, 500 (`ERR_STORAGE_IO`), không tới được, và vi phạm hợp đồng.

### Điều hướng giữa các trang khách hàng (D1)

- Điều hướng nằm trong **trạng thái**, không nằm trong URL (như cũ). Từ D1, một trang có thể nhận **tham số**: `client_detail` nhận `client_id`; `client_form` nhận chế độ `create`, hoặc `edit` kèm `client_id`. Tham số được khai báo **có kiểu** trong bảng điều hướng (`screens/navigation.ts`).
- Một trang có thể chuyển cho trang kế tiếp **một thông báo ngắn**, ví dụ "Đã lưu khách hàng". Thông báo này hiện một lần ở trang đích.
- Luồng:
  - `client_list` → bấm một khách → `client_detail(client_id)`;
  - `client_list` → "Thêm khách hàng" → `client_form(create)` → lưu thành công → `client_detail(client_id mới)`, kèm thông báo "Đã thêm khách hàng";
  - `client_detail` → "Sửa" → `client_form(edit, client_id)` → lưu thành công → `client_detail(client_id)`, kèm "Đã lưu thay đổi";
  - "Hủy" ở form quay về trang trước (`client_detail` nếu đang sửa, `client_list` nếu đang thêm); "Quay lại danh sách" ở chi tiết về `client_list`.
- V1 **không** chặn rời form khi có thay đổi chưa lưu. Việc đó thuộc V2 (trải nghiệm dùng).

### Chi tiết trang `client_list` (sửa ở D1)

- **Thao tác:** (1) tải và tải lại danh sách, như B2b; (2) "Thêm khách hàng" là **hành động chính**, mở `client_form(create)`; (3) bấm một khách mở `client_detail`. Thao tác (2) và (3) chỉ là điều hướng, không gọi phía sau.
- **Trạng thái rỗng:** "Chưa có khách hàng nào", kèm nút "Thêm khách hàng" (§7.2, nguyên tắc 6).
- Nhóm "Đã lưu trữ" giữ nguyên như B2b.

### Chi tiết trang `client_detail` (D1)

- **Khi mở:** gọi `get_client` (`GET /clients/{client_id}`). Hiện tên hiển thị, danh sách liên hệ dạng "kênh: giá trị", ghi chú (không có thì không hiện mục này), trạng thái ("Đang hoạt động" hoặc "Đã lưu trữ"), ngày tạo và ngày sửa gần nhất. Ngày giờ hiển thị theo giờ của máy, định dạng tiếng Việt.
- **Thao tác:**
  - "Sửa" là **hành động chính**, mở `client_form(edit, client_id)`.
  - "Lưu trữ" (khi đang hoạt động) hoặc "Bỏ lưu trữ" (khi đã lưu trữ) là hành động phụ. Gọi `set_client_archived` (`PUT /clients/{client_id}/archived`, `is_archived` true/false).
    - Thành công: cập nhật trang, và hiện thông báo nói rõ hậu quả. Ví dụ khi lưu trữ: "Đã lưu trữ. Khách này sẽ không có trong danh sách chọn khi tạo đơn mới; đơn cũ không bị ảnh hưởng." (hợp đồng: không tạo được đơn cho khách đã lưu trữ).
    - Lưu trữ **quay lại được**, nên **không** hỏi xác nhận (§7.2, nguyên tắc 5 chỉ áp dụng cho thao tác khó quay lại).
  - "Quay lại danh sách".
- **Nhãn kết quả phải xử lý:**
  - `get_client`: 200, 404 (hiện "Không tìm thấy khách hàng này", kèm nút quay lại danh sách), 500, không tới được, vi phạm hợp đồng;
  - `set_client_archived`: 200, 400, 404, 500, không tới được, vi phạm hợp đồng.
- Khi thao tác lưu trữ đang gửi đi, nút tương ứng bị vô hiệu, để không gửi hai lần.

### Chi tiết trang `client_form` (D1)

- **Chế độ `create`:** form trống. **Chế độ `edit`:** gọi `get_client` trước, rồi điền sẵn dữ liệu; 404 thì hiện "Không tìm thấy khách hàng này", kèm nút quay lại.
- **Các ô**, theo `client_input` của hợp đồng:
  - "Tên hiển thị": bắt buộc; tối đa 120 ký tự, đếm theo ký tự thật (code point), không theo đơn vị UTF-16;
  - "Liên hệ": danh sách hàng, mỗi hàng có "Kênh" (chữ tự do, có gợi ý: email, facebook, instagram, discord, zalo, x) và "Giá trị". Có nút "Thêm liên hệ" và nút bỏ từng hàng. Không giới hạn số hàng, vì hợp đồng không giới hạn;
  - "Ghi chú": tùy chọn, nhiều dòng.
- **Kiểm trước khi gửi**, trong phân khu logic, trả `rejected_input` kèm lỗi từng ô. Từ Data Schema **7.0.0** (CT-2), `display_name`, `channel` và `value` đều **not blank** (`clause_a_common.formats.not_blank`); các luật dưới đây là bản sao của hợp đồng ở phía giao diện, trừ những điều ghi `[UI-ONLY]`:
  - `[UI-ONLY]` bỏ khoảng trắng ở hai đầu mọi ô trước khi kiểm và gửi. Hợp đồng không đòi việc này: backend lưu đúng giá trị nhận được. Giao diện chọn gửi giá trị đã bỏ khoảng trắng;
  - tên rỗng sau khi bỏ khoảng trắng: lỗi "Nhập tên khách hàng"; quá 120 ký tự: lỗi nêu giới hạn;
  - `[UI-ONLY]` hàng liên hệ trống cả hai ô thì bỏ đi, không báo lỗi. Trống **một** trong hai ô thì báo lỗi ngay trên hàng đó (hợp đồng: `channel` và `value` not blank);
  - `[UI-ONLY]` ghi chú rỗng sau khi bỏ khoảng trắng thì gửi `null`.
  - Giao diện dùng `String.prototype.trim`, backend dùng cách bỏ khoảng trắng của Python. Hai cách chỉ khác nhau ở vài ký tự điều khiển hiếm. Khi đó backend là bên quyết định, trả 400, và giao diện hiện thông báo lỗi 400 như mọi trường hợp 400 khác.
- **Vị trí nút (từ phiên 17):** hàng nút "Lưu" (hành động chính) và "Hủy" đặt **ngay dưới tiêu đề trang**, đúng chỗ hàng nút của `client_list` và `client_detail` (§7.2, nguyên tắc 7). Nhờ vậy "Lưu" luôn thấy được, dù form dài tới đâu.
- **Khi có lỗi nhập (từ phiên 17):** con trỏ nhập (focus) chuyển tới **ô lỗi đầu tiên** theo thứ tự trên màn hình, để người dùng thấy ngay ô cần sửa, kể cả khi ô đó nằm ngoài vùng đang nhìn.
- **Gửi:** `create_client` (`POST /clients`) hoặc `edit_client` (`PUT /clients/{client_id}`), thân `{ "client_input": … }` (`endpoint_forms.http`).
  - Trong lúc gửi, nút "Lưu" bị vô hiệu.
  - 201 hoặc 200: chuyển sang `client_detail`, kèm thông báo (xem phần điều hướng).
  - 400: hiện một thông báo chung ở đầu form, ví dụ "Máy chủ không nhận dữ liệu này", và **giữ nguyên** dữ liệu đã nhập. **Không** đọc `error_body.details`: hợp đồng chỉ khai `details: object|null`, không khai hình dạng bên trong, nên dựa vào nó là dựa vào chi tiết cài đặt của backend.
  - 500, không tới được: thông báo, giữ nguyên dữ liệu đã nhập, cho gửi lại.
- **Nhãn kết quả phải xử lý:**
  - `create_client`: 201, 400, 500, không tới được, vi phạm hợp đồng;
  - `edit_client`: 200, 400, 404, 500, không tới được, vi phạm hợp đồng;
  - `get_client` (chế độ `edit`): như ở `client_detail`.
- Tên trùng nhau được phép, vì hợp đồng không cấm.

### Luật phủ của kịch bản bấm thử ở D1 (iWCA I6.3)

- Với dữ liệu đã qua kiểm ở phân khu logic, người dùng **không có cách bình thường nào** gây ra 400, 404 hay 500: không có thao tác xóa khách hàng, và định dạng đã được kiểm trước. Vì vậy luật phủ **không đòi** bước `rejected_system` cho ba trang này. Kiểm thử dựng trang (I5) chứng minh các nhãn đó được hiển thị đúng.
- Luật phủ **đòi**:
  - `rejected_input` cho thao tác lưu của `client_form`, ở cả hai chế độ;
  - `ok` cho mọi thao tác;
  - ít nhất một bước `unreachable` cho **mỗi** trang.

## 6. Đối chiếu độ phủ (Bước I1.6)

- Mọi lối vào ở §1, hoặc có workflow giao diện đối ứng ở §2, hoặc nằm trong bảng loại trừ ở §4. Không lối vào nào ở trạng thái "chưa rõ".
- Không có nhu cầu V1 nào mà thực đơn không đáp ứng được. Việc sắp xếp tên tiếng Việt là quyết định trình bày, không cần endpoint mới.
- Giá trị khởi động đã trả lời đủ ba câu. Cách trao nằm trong hợp đồng và đã được đo.

## 7. Hướng giao diện V1 (quyết định của Project Owner, 2026-09-28)

Nguồn: `.design/product_versions.md`. V1 **không** gọt diện mạo: diện mạo thuộc V3, trải nghiệm dùng thuộc V2. Mục này chỉ đặt **nền tối thiểu**, để các trang của chặng D nhất quán với nhau và V2 không phải làm lại từ đầu.

### 7.1 Token nền

Đặt trong `kit/tokens/tokens.css`. Mọi component dùng token, theo luật R7.

- **Giao diện tối là chủ đạo, và là giao diện duy nhất ở V1.** Giao diện sáng để sau. Đặt tên token theo **vai trò** (ví dụ `--color-surface`, `--color-text`, `--color-accent`), không theo **giá trị** (`--dark-gray`), để sau này thêm giao diện sáng chỉ phải thêm một bộ giá trị.
- **Nền là xám trung tính tối, không phải đen tuyền.** Có hai hoặc ba bậc bề mặt (nền trang, thẻ hay khung, phần tử nổi). Người dùng là họa sĩ: nền không được ngả màu, để không làm lệch cảm nhận màu của họ.
- **Một màu nhấn, độ bão hòa vừa phải**, dùng cho hành động chính. Thêm một màu cho lỗi và một màu cho thành công, cũng vừa phải.
- **Chữ đủ tương phản để đọc lâu:** tối thiểu **WCAG AA**, tức 4.5:1 với chữ thường. Chữ phụ nhạt hơn, nhưng vẫn đạt AA.
- **Thành phần tương tác nhận ra được** (từ phiên 17; WCAG 2.1 AA, tiêu chí 1.4.11): viền của ô nhập, vòng focus, viền báo lỗi của ô, và vạch đánh dấu mục điều hướng đang mở phải đạt **≥ 3:1** so với nền ngay cạnh nó. Viền trang trí của khung và danh sách không thuộc luật này, nên có thể giữ nhạt. Máy kiểm cả luật này, trong cùng phép kiểm tương phản. Trạng thái vô hiệu được miễn, theo WCAG.
- **Phông:** giữ nhóm token `font-family` đã có (phông hệ thống có dấu tiếng Việt). Ít cỡ chữ, ví dụ ba hay bốn bậc.

### 7.2 Nguyên tắc dễ chịu tối thiểu

Kịch bản bấm thử và audit kiểm các điều sau.

1. **Mỗi trang có một hành động chính rõ ràng**, nổi bật hơn các hành động phụ.
2. **Không dày thông tin.** Danh sách chỉ hiện những gì cần để nhận ra và chọn; chi tiết nằm ở trang chi tiết hay form.
3. **Nhãn tiếng Việt, rõ nghĩa, theo ngôn ngữ của họa sĩ**, không theo tên kỹ thuật. Ví dụ "Lưu trữ khách hàng", không phải "archive".
4. **Sau mỗi thao tác ghi có phản hồi rõ:** đã lưu, hay lỗi gì. Lỗi nhập liệu hiện ngay cạnh ô sai, bằng lời dễ hiểu, và con trỏ nhập chuyển tới ô lỗi đầu tiên.
5. **Thao tác khó quay lại thì hỏi xác nhận**, và nói rõ hậu quả.
6. **Trạng thái rỗng chỉ cho người dùng việc tiếp theo.** Ví dụ: "Chưa có khách hàng nào" kèm nút thêm.
7. **Điều hướng ổn định:** vị trí các mục điều hướng và nút chính không đổi giữa các trang. Mọi trang có một **hàng nút ngay dưới tiêu đề trang**, và hành động chính đứng đầu hàng đó; form cũng vậy.

**Không làm ở V1:** animation, transition, hiệu ứng trang trí, component lấy từ nguồn ngoài (React Bits…), giao diện sáng, tùy chỉnh giao diện.

## Lịch sử cập nhật

- 2026-09-26: bản đầu. Đủ ba bảng cho toàn V1; chi tiết trang `client_list`.
- 2026-09-27: sau audit phiên 11 (B2a): màn hình lỗi khởi động không phải layout (sửa §5, không đổi hành vi).
- 2026-09-27: `client_list` → `đang_làm` (plan phiên 12).
- 2026-09-27: `client_list` → `hoàn_tất`: agent đề xuất theo I6, Orchestrator audit (`.reviews/audits/ui/audit_ui_session12.md`), Project Owner tự chạy S1–S3 trên Windows.
- 2026-09-28: thêm §7, hướng giao diện V1 (giao diện tối, token nền, nguyên tắc dễ chịu tối thiểu) theo `product_versions.md`; watermark ở §4 ghi là V4 trở đi.
- 2026-09-28: làm lại I1 cho D1: trang `client_detail`, `client_form`; `client_list` sửa (hành động thêm, bấm vào khách) → `đang_làm`; điều hướng có tham số và thông báo chuyển trang; vùng điều hướng trong `main_layout`; luật phủ của D1. Căn cứ hợp đồng không đổi (Data Schema 6.2.0 không đổi gì ở phía giao diện).
- 2026-09-28: sau audit phiên 16. `client_form` ghi rõ luật nào sao từ hợp đồng (Data Schema 7.0.0, CT-2: not blank) và luật nào `[UI-ONLY]`. Hàng nút của form nằm dưới tiêu đề, và focus chuyển tới ô lỗi đầu tiên. §7.1 thêm luật tương phản 3:1 cho thành phần tương tác. §7.2 bổ sung nguyên tắc 4 và 7. Ba trang giữ `đang_làm`, vá ở phiên 17.
- 2026-09-28: audit phiên 17 đạt (`.reviews/audits/ui/audit_ui_session17.md`). Ba trang D1 chờ Project Owner chạy tay ba kịch bản, rồi chuyển `hoàn_tất`.
- 2026-09-28: `client_list`, `client_detail`, `client_form` → `hoàn_tất`. Project Owner đã tự chạy tay ba kịch bản và xác nhận chức năng chạy đúng. Chặng D1 xong về phía giao diện.
