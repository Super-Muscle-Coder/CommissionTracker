# Phân rã giao diện (iWCA I1) — Commission Tracker V1

*Orchestrator + Project Owner, 2026-09-26. Đầu ra của Giai đoạn I1, skill `iwca-implementation` v1.0. Căn cứ: Data Schema 6.1.0, API Contract 4.0.0 (`approved`); phạm vi ở `.design/v1_scope.md`; thứ tự màn hình ở `.plan/v1_roadmap.md`, chặng D–F.*

Tài liệu bền, không ghi đè mỗi phiên. **Chỉ Orchestrator sửa tệp này**; coding agent chỉ đọc (xem `CLAUDE.md` mục 5, "Vận hành layer giao diện"). I1 được làm lại, tức là tệp này được cập nhật, trước mỗi phiên thêm trang mới.

Mức chi tiết hiện tại: bảng workflow, bảng loại trừ và bảng giá trị khởi động đã đủ cho **toàn bộ V1**. Riêng bảng trang, chỉ trang đầu tiên (`client_list`, phiên B2b) có danh sách thao tác chi tiết. Các trang khác được liệt kê để đối chiếu độ phủ; thao tác của chúng sẽ được chi tiết ở lần làm lại I1 ngay trước phiên của chúng.

---

## 1. Thực đơn — mọi lối vào có `external` trong `called_by` (Bước I1.1)

Bảng này sinh ra từ `api_contract.yaml` 4.0.0, đối chiếu lại với 5.0.0 ngày 2026-10-09 (chặng F). Mỗi khi hợp đồng đổi phiên bản, đối chiếu lại bảng.

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
| `restore_data` (desktop) | `request_restore`, `get_restore_status`, `cancel_restore` | ipc `restore:prepare`, `restore:status`, `restore:cancel` | 200, 400, 404, 409, 424, 500, 503 (prepare); 200, 500 (status, cancel). Theo API Contract 5.0.0 (CT-7); chi tiết ở mục "Chặng F — Khôi phục". `apply_pending_restore` (`in_process`, chỉ `restore_trigger` gọi) không có `external`, nên không nằm trong bảng |
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
| `scaffold_ui` | `nền_tảng` | — | Không có quyết định. Chuẩn bị tài nguyên `http_client` từ `backendBaseUrl`; **từ chặng E (phiên 34)** thêm tài nguyên `ipc_bridge` từ `invoke` (Desktop có lối vào `ipc` đầu tiên từ phiên 33). | B2a, E |
| `manage_client` | `nghiệp_vụ` | `manage_client` | Sắp danh sách khách hàng theo thứ tự chữ cái tiếng Việt (backend trả theo `casefold`, nên "Ánh" đứng sau "z"); tách khách đang hoạt động và khách đã lưu trữ; chọn câu thông báo cho từng nhãn lỗi. **Từ D1:** kiểm dữ liệu form trước khi gửi (§5, trang `client_form`); định dạng ngày giờ để hiển thị. | B2b, D1 |
| `manage_commission` | `nghiệp_vụ` | `manage_commission` | Ghép tên khách hàng vào danh sách và chi tiết đơn. Adapters của workflow này gọi luôn `GET /clients` và `GET /clients/{client_id}`: đây là trùng lặp có chủ đích theo I1.3, không đi qua `manage_client` của giao diện. Sắp danh sách đơn (hợp đồng không hứa thứ tự). Đọc và định dạng số tiền theo `currency_code`; định dạng ngày hạn giao. Kiểm dữ liệu form trước khi gửi (§5, trang `commission_form`). Chi tiết từ D2 ở §5. | D2 |
| `update_progress` | `nghiệp_vụ` | `update_progress` | Nhóm bảng tiến độ theo giai đoạn, theo thứ tự của `list_stages`; ghép tiêu đề và hạn giao của đơn vào bảng (Adapters gọi luôn `GET /commissions`, trùng lặp có chủ đích theo I1.3). Đặt tên tiếng Việt cho từng giai đoạn. Kiểm form đổi giai đoạn. Chi tiết từ D3 ở §5. | D3 |
| `record_payment` | `nghiệp_vụ` | `record_payment` | Trình bày số dư (gồm cả trường hợp thu dư) và các khoản đã hủy; tên tiếng Việt của chiều tiền và loại khoản; đọc số tiền và ngày giờ nhận tiền; kiểm form. Chi tiết từ D4 ở §5. | D4 |
| `view_income_report` | `nghiệp_vụ` | `view_income_report` | Trình bày báo cáo theo tháng và theo tiền tệ. Không quy đổi tiền tệ (hợp đồng). Chọn khoảng thời gian mặc định, kiểm khoảng thời gian trước khi gửi. Chi tiết từ D5 ở §5. | D5 |
| `send_reminder` | `nghiệp_vụ` | `send_reminder` | Trình bày danh sách nhắc việc đang chờ và phần cài đặt; tên tiếng Việt của thứ, đơn vị chu kỳ, mốc nhắc; kiểm form cài đặt. Không gọi `check_due` (chỉ `reminder_ticker` của desktop gọi). Chi tiết từ D6 ở §5. | D6 |
| `backup_data` | `nghiệp_vụ` | `backup_data` | Mở hộp thoại chọn thư mục (Adapters gọi `native_dialogs.pick_folder` qua `ipc_bridge`), rồi tạo bản sao lưu vào thư mục đó (`create_backup`, luôn `purpose: 'manual'`); trình bày kết quả (đường dẫn tệp, dung lượng, lúc tạo); chọn câu thông báo cho từng nhãn và cho lần hộp thoại hỏng. Chi tiết ở mục "Chặng E — Sao lưu". | E |
| `restore_data` | `nghiệp_vụ` | `restore_data` (desktop, `ipc`) | Đọc trạng thái khôi phục đang chờ (`restore:status`); mở hộp thoại chọn tệp sao lưu (Adapters gọi `native_dialogs.open_file` qua `ipc_bridge`); hỏi xác nhận trong trang, nói rõ hậu quả; chuẩn bị (`restore:prepare`); hủy lần đang chờ (`restore:cancel`); chọn câu thông báo cho từng nhãn; đọc lại trạng thái sau mọi lần chuẩn bị hay hủy không thành. Không dùng `http_client`. Chi tiết ở mục "Chặng F — Khôi phục". | F |

**`native_dialogs`** là hạ tầng cắt ngang của desktop, không có workflow giao diện đối ứng. Workflow giao diện nào cần chọn tệp hay thư mục (`backup_data` với `pick_folder`, `restore_data` với `open_file`) gọi nó qua Adapters của chính mình, dùng tài nguyên `ipc_bridge`; mỗi workflow giữ bản riêng của địa chỉ và cách kiểm hình dạng câu trả lời (trùng lặp có chủ đích, như I1.3). Desktop có `pick_folder` từ phiên 33 và `open_file` từ phiên 35; `save_file` chưa có, và giao diện không gọi nó.

## 3. Giá trị khởi động (Bước I1.4)

| Giá trị | Là gì, định dạng | Trao bằng cách nào | Căn cứ trong hợp đồng |
|---|---|---|---|
| `backendBaseUrl` | Chuỗi `http://<loopback_host>:<port>`, ví dụ `http://127.0.0.1:51062`; cổng do desktop Main chọn lúc chạy | Thuộc tính của đối tượng đóng băng `window.<renderer_bridge>` (`window.commissionTracker`), do preload của desktop đặt trước khi code renderer chạy. **Chỉ Main của UI đọc nó** (R12). | Data Schema 6.1.0: `clause_a_common.mandatory_rules` (luật renderer), `shared_values.renderer_bridge`, `shared_values.loopback_host`. Đã đo thật ở B1 (`.reviews/audits/desktop/audit_desktop_session10.md`). |
| `invoke` (từ chặng E) | Hàm `invoke(address, argument)`, trả Promise của `{ status, body }`; Promise bị từ chối khi địa chỉ chưa có, đối số sai, hộp thoại lỗi hay khung gửi bị từ chối (Desktop, `native_dialogs-EXP-002`) | Cùng đối tượng bridge. Desktop luôn đặt nó từ phiên 33 (bridge có đúng hai khóa `backendBaseUrl`, `invoke`). **Chỉ Main của UI đọc nó** (R12), rồi trao cho `scaffold_ui` để dựng `ipc_bridge`. | Data Schema 6.1.0 (luật renderer); API Contract 4.0.0, `endpoint_forms.ipc`. Đã đo thật ở phiên 33 (`.reviews/audits/desktop/audit_desktop_session33.md`). |

⚠ Main của UI phải kiểm định dạng `backendBaseUrl`: là chuỗi, đúng dạng `http://127.0.0.1:<1..65535>`. Nếu thiếu bridge, thiếu thuộc tính, hoặc sai dạng, Main hiện màn hình lỗi khởi động và dừng (iWCA I2.6, bước 1). **Từ phiên 34**, `invoke` cũng là giá trị bắt buộc: không phải hàm thì cùng màn hình lỗi khởi động, kèm tên giá trị (`window.commissionTracker.invoke`). Lý do không cho nó tùy chọn: Desktop luôn đặt nó, nên thiếu nó nghĩa là renderer đang chạy ngoài Desktop hoặc với một Desktop cũ, và đó là lỗi khởi động như thiếu `backendBaseUrl`. Nhánh này được chứng minh bằng kiểm thử dựng Main trong jsdom (không có bridge, bridge thiếu thuộc tính, `backendBaseUrl` sai dạng). Không dùng `file://` để thử: hợp đồng không bao giờ nạp renderer từ `file://`, và module script của bản build vốn không chạy được ở đó.

## 4. Loại trừ có chủ đích (Bước I1.2)

| Lối vào | Lý do không dùng ở V1 |
|---|---|
| Mọi điểm giao tiếp của `manage_watermark_profile` (`/watermark-profiles…`, `GET /watermark-strengths`) | ⚠ **Không có màn hình hồ sơ quyền sở hữu ở V1** (`.design/v1_scope.md`, mục 3.1). Endpoint đang chạy thật nhưng tính năng nhúng chưa có. Họa sĩ điền thông tin cho một tính năng không tồn tại là niềm tin sai do chính ứng dụng tạo ra. Không workflow giao diện, không trang, không lời gọi nào tới các địa chỉ này. |
| Mọi điểm giao tiếp của `apply_watermark`, `verify_watermark` | Watermark thuộc V4 trở đi (`product_versions.md`; `v1_scope` mục 3.1). Backend chưa ráp nối các workflow này. |
| `send_reminder.check_due` (`POST /reminders/checks`) | Không có `external` trong `called_by`: chỉ `reminder_ticker` của desktop gọi. Có mặt ở đây để không ai tưởng là còn sót. |
| `backup_data.prepare_restore` | Chỉ `restore_data` của desktop gọi. |

## 5. Trang và layout (Bước I1.5)

Layout: `main_layout` (khung chính có điều hướng) — layout duy nhất. **Từ D1:** `main_layout` có một vùng điều hướng cố định, liệt kê các mục cấp cao nhất. Hiện có bảy mục, theo thứ tự: "Khách hàng" (mở `client_list`), "Đơn hàng" (mở `commission_list`, từ D2), "Tiến độ" (mở `progress_board`, từ D3), "Thu nhập" (mở `income_report`, từ D5), "Nhắc việc" (mở `reminder_list`, từ D6), "Sao lưu" (mở `backup`, từ chặng E), rồi "Khôi phục" (mở `restore`, từ chặng F). Mỗi phiên sau thêm mục của mình vào đúng vùng này, không đổi vị trí các mục cũ (§7.2, nguyên tắc 7). Màn hình lỗi khởi động không phải layout và không phải đích điều hướng: Main dựng thẳng component kit `FatalMessage` khi giá trị khởi động hỏng, trước khi có trang nào (iWCA I2.6, bước 1).

| Trang (khóa điều hướng) | Mục đích | Workflow giao diện dùng Routers | Layout | Trạng thái |
|---|---|---|---|---|
| `client_list` | Xem danh sách khách hàng; lối vào thêm khách và xem chi tiết | `manage_client` | `main_layout` | `hoàn_tất` (2026-09-28: phiên 16 và 17, audit phiên 17 đạt, Project Owner tự chạy tay. Trước đó `hoàn_tất` ngày 2026-09-27 với phạm vi chỉ đọc) |
| `client_detail` | Xem một khách hàng; lưu trữ, bỏ lưu trữ; lối vào sửa | `manage_client` | `main_layout` | `hoàn_tất` (2026-09-28: phiên 16 và 17, audit phiên 17 đạt, Project Owner tự chạy tay) |
| `client_form` | Thêm khách hàng mới, hoặc sửa một khách hàng | `manage_client` | `main_layout` | `hoàn_tất` (2026-09-28: phiên 16 và 17, audit phiên 17 đạt, Project Owner tự chạy tay) |
| `commission_list` | Xem danh sách đơn hàng; lối vào thêm đơn và xem chi tiết | `manage_commission` | `main_layout` | `hoàn_tất` (2026-09-29: audit phiên 21 đạt, Project Owner tự chạy tay) |
| `commission_detail` | Xem một đơn hàng; lối vào sửa; **từ D3:** phần "Tiến độ"; **từ D4:** phần "Thanh toán" (số dư, lối vào danh sách thanh toán) | `manage_commission`; từ D3 thêm `update_progress`; từ D4 thêm `record_payment` | `main_layout` | `hoàn_tất` (2026-09-30: audit phiên 22 đạt, Project Owner chạy tay D4; phần Thanh toán thêm ở phiên 22) |
| `commission_form` | Thêm đơn hàng mới, hoặc sửa một đơn | `manage_commission` | `main_layout` | `hoàn_tất` (2026-09-29: audit phiên 21 đạt, Project Owner tự chạy tay) |
| `progress_board` | Xem mọi đơn hàng nhóm theo giai đoạn; lối vào chi tiết đơn | `update_progress` | `main_layout` | `hoàn_tất` (2026-09-29: audit phiên 21 đạt, Project Owner tự chạy tay) |
| `stage_change` | Đổi giai đoạn của một đơn, kèm ghi chú | `update_progress` | `main_layout` | `hoàn_tất` (2026-09-29: audit phiên 21 đạt, Project Owner tự chạy tay) |
| `payment_list` | Xem số dư và mọi khoản thanh toán của một đơn; hủy một khoản; lối vào ghi khoản mới | `record_payment` | `main_layout` | `hoàn_tất` (2026-09-30: audit phiên 22 đạt, Project Owner chạy tay D4) |
| `payment_form` | Ghi một khoản nhận tiền hoặc hoàn tiền cho một đơn | `record_payment` | `main_layout` | `hoàn_tất` (2026-09-30: audit phiên 22 đạt, Project Owner chạy tay D4) |
| `income_report` | Xem thu nhập theo khoảng thời gian: thực nhận, tiền hoàn, còn phải thu, theo từng đơn vị tiền và theo tháng | `view_income_report` | `main_layout` | `hoàn_tất` (2026-10-01: audit phiên 24 và 25 đạt, CT-5 duyệt, Project Owner chạy tay D5) |
| `reminder_list` | Xem nhắc việc đang chờ; đánh dấu đã xem; lối vào cài đặt và chi tiết đơn | `send_reminder` | `main_layout` | `hoàn_tất` (2026-10-03: audit phiên 27 đạt, Project Owner chạy tay) |
| `reminder_settings` | Xem và sửa cài đặt nhắc định kỳ và nhắc trước hạn giao | `send_reminder` | `main_layout` | `hoàn_tất` (2026-10-03: audit phiên 27 đạt, Project Owner chạy tay) |
| `backup` | Tạo một tệp sao lưu toàn bộ dữ liệu vào thư mục họa sĩ chọn | `backup_data` | `main_layout` | `hoàn_tất` (2026-10-08: audit phiên 34 đạt, Project Owner chạy tay với hộp thoại thật) |
| `restore` | Chọn một tệp sao lưu và chuẩn bị khôi phục (áp dụng ở lần mở ứng dụng kế tiếp); xem và hủy lần khôi phục đang chờ | `restore_data` | `main_layout` | `hoàn_tất` (2026-10-09: audit phiên 37 đạt, Project Owner chạy tay với hộp thoại thật, gồm một lần đóng rồi mở lại) |

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

## Chặng D2 — Đơn hàng (làm lại I1 ngày 2026-09-28, trước phiên 19)

Căn cứ: Data Schema **8.0.1** (`manage_commission`: `commission_input`, `commission_detail`, `commission_list`, `currency_options`; `formats.not_blank`, `types.money`, `formats.date`), API Contract 4.0.0 (`manage_commission`, cùng `list_clients` và `get_client` của `manage_client`).

### Lời gọi của workflow giao diện `manage_commission`

| Lời gọi | Dùng ở | Nhãn phải xử lý (hợp đồng) |
|---|---|---|
| `list_commissions` (`GET /commissions`) | `commission_list` | 200, 500 |
| `get_commission` (`GET /commissions/{commission_id}`) | `commission_detail`, `commission_form(edit)` | 200, 404, 500 |
| `create_commission` (`POST /commissions`) | `commission_form(create)` | 201, 400, 404, 409, 500 |
| `edit_commission` (`PUT /commissions/{commission_id}`) | `commission_form(edit)` | 200, 400, 404, 409, 500 |
| `list_currencies` (`GET /currencies`) | `commission_form(create)` | 200 |
| `list_clients` (`GET /clients`) | `commission_list` (tên khách), `commission_form` (danh sách chọn) | 200, 500 |
| `get_client` (`GET /clients/{client_id}`) | `commission_detail` (tên khách) | 200, 404, 500 |

Mọi lời gọi còn phải xử lý thêm "không tới được" và "vi phạm hợp đồng", như D1. Lời gọi `list_clients`, `get_client` nằm trong Adapters của `manage_commission` (I1.3), không import `manage_client` của giao diện (R2).

Một thao tác cần hai lời gọi (danh sách đơn cùng danh sách khách; chi tiết đơn cùng khách của nó) thì là **một** thao tác với **một** kết quả. Lời gọi nào hỏng thì kết quả là lỗi của lời gọi đó, và trang hiện như mọi lỗi tải khác, có nút tải lại. Ngoại lệ: ở `commission_detail`, `get_client` trả 404 thì không phải lỗi; tên khách hiện là "Không tìm thấy khách hàng".

### Luật trình bày chung của D2 (quyết định của `manage_commission`, đều `[UI-ONLY]`)

- **Thứ tự danh sách đơn:** hợp đồng không hứa thứ tự của `commission_list`. Giao diện sắp theo `updated_at` mới nhất trước, rồi theo `commission_id`.
- **Thứ tự khách trong danh sách chọn:** chữ cái tiếng Việt (`Intl.Collator('vi')`), như `manage_client`. Workflow này giữ **bản riêng** của cách sắp và cách định dạng ngày giờ, không import từ `manage_client` (R2; tiền lệ `_not_blank` ở backend).
- **Số tiền (`types.money`).** `amount_minor` là số nguyên theo đơn vị nhỏ nhất của ISO 4217. Configs của workflow giữ bảng **số chữ số lẻ** của từng mã tiền: `VND: 0`, `USD: 2`. Đây là hai mã mặc định của `supported_currencies`.
  - **Hiển thị:** dạng `<số> <mã>`, nhóm nghìn bằng dấu chấm, phần lẻ sau dấu phẩy, đúng số chữ số lẻ của mã tiền. Ví dụ `1.500.000 VND`, `12,50 USD`, `0 VND`. Tách phần nguyên và phần lẻ bằng phép tính số nguyên; **không** chia ra số thực, vì `amount_minor` có thể tới 2^53−1.
  - Mã tiền không có trong bảng thì hiện `<amount_minor> <mã> (đơn vị nhỏ nhất)`, và không có trong danh sách chọn của form.
  - **Đọc số người dùng nhập** (form):
    1. bỏ khoảng trắng ở hai đầu và ở giữa;
    2. rỗng: lỗi "Nhập giá thỏa thuận";
    3. chỉ được có chữ số, dấu chấm, dấu phẩy, và phải bắt đầu bằng chữ số; sai thì lỗi "Số tiền không hợp lệ";
    4. với mã tiền có chữ số lẻ: nếu chuỗi kết thúc bằng một dấu chấm hoặc dấu phẩy rồi **1 tới đúng số chữ số lẻ** chữ số, thì đó là phần lẻ;
    5. phần còn lại là phần nguyên: mỗi dấu chấm hoặc dấu phẩy trong đó phải là dấu nhóm nghìn, tức theo sau là **đúng 3** chữ số; sai thì lỗi "Số tiền không hợp lệ";
    6. số âm không thể xảy ra, vì dấu trừ bị bước 3 chặn. Giá 0 hợp lệ (hợp đồng: `amount_minor >= 0`);
    7. kết quả vượt 9007199254740991 thì lỗi "Số tiền quá lớn".

    Ví dụ, VND: `1500000`, `1.500.000`, `1,500,000` → 1500000; `1,5` và `1.50` → lỗi. USD: `12.5`, `12,50` → 1250; `1,250` và `1.250` → 125000; `1.250,5` → 125050; `12.505` → 1250500 (dấu chấm là nhóm nghìn: mười hai nghìn năm trăm lẻ năm đô); `12.5055` và `1.2345` → lỗi.
  - Ở chế độ sửa, ô số tiền điền sẵn đúng dạng hiển thị mà không có mã tiền, ví dụ `1.500.000` hoặc `12,50`. Dạng này đọc lại được bằng luật trên.
- **Ngày hạn giao (`deadline: date|null`):** hiển thị `dd/mm/yyyy`, tách thẳng từ chuỗi `YYYY-MM-DD`. **Không** đi qua `new Date(...)`, vì đọc chuỗi ngày thành thời điểm UTC có thể lệch sang ngày khác theo múi giờ. Không có hạn thì hiện "Không có hạn".
- **Ngày giờ tạo, sửa (`timestamp`):** như `client_detail`.

### Chi tiết trang `commission_list` (D2)

- **Mở từ:** mục "Đơn hàng" của vùng điều hướng.
- **Khi mở, và khi bấm "Tải lại":** `list_commissions` và `list_clients`, là một thao tác.
- **Mỗi đơn hiện:** tiêu đề (dòng chính); dòng phụ gồm tên khách, giá thỏa thuận, hạn giao. `client_id` không có trong danh sách khách thì tên khách hiện "Không tìm thấy khách hàng". Không hiện thêm gì (§7.2, nguyên tắc 2).
- **Thao tác:** "Thêm đơn hàng" là **hành động chính**, mở `commission_form(create)`; bấm một đơn mở `commission_detail(commission_id)`. Hai thao tác này chỉ là điều hướng.
- **Trạng thái rỗng:** "Chưa có đơn hàng nào", kèm nút "Thêm đơn hàng".
- **Nhãn phải xử lý:** 200, 500, không tới được, vi phạm hợp đồng, cho cả hai lời gọi.

### Chi tiết trang `commission_detail` (D2)

- **Khi mở:** `get_commission`, rồi `get_client` với `client_id` của đơn.
- **Hiện:** tiêu đề; khách hàng (tên; khách đã lưu trữ thì thêm "(đã lưu trữ)"); loại tranh (không có thì không hiện mục này); giá thỏa thuận; hạn giao; mô tả (không có thì không hiện); liên kết tham khảo (danh sách rỗng thì không hiện); ngày tạo; ngày sửa gần nhất.
- **Liên kết tham khảo hiện dạng chữ thường, chọn và sao chép được, không bấm mở được.** Desktop V1 chặn mọi điều hướng và cửa sổ mới (kiểm thử số 8 của `Desktop/`), và hợp đồng chưa có lối vào `ipc` để mở trình duyệt ngoài. Mở liên kết là việc của phiên bản sau.
- **Thao tác:** "Sửa" là **hành động chính**, mở `commission_form(edit, commission_id)`; "Quay lại danh sách" về `commission_list`.
- **Nhãn phải xử lý:** `get_commission`: 200, 404 ("Không tìm thấy đơn hàng này", kèm nút quay lại danh sách), 500, không tới được, vi phạm hợp đồng. `get_client`: 200, 404 (không phải lỗi, xem trên), 500, không tới được, vi phạm hợp đồng.
- D2 **không** có giai đoạn tiến độ (D3) và thanh toán (D4) trên trang này.

### Chi tiết trang `commission_form` (D2)

- **Chế độ `create`:** gọi `list_clients` và `list_currencies`, là một thao tác. **Chế độ `edit`:** gọi `get_commission` và `list_clients`, là một thao tác; 404 thì hiện "Không tìm thấy đơn hàng này", kèm nút quay lại.
- **Các ô**, theo `commission_input`, theo thứ tự trên màn hình:
  1. "Khách hàng": chọn từ danh sách, **bắt buộc**. Danh sách gồm các khách **đang hoạt động**, sắp theo chữ cái tiếng Việt, có một lựa chọn đầu "Chọn khách hàng" nghĩa là chưa chọn. Ở chế độ `edit`, nếu khách hiện tại của đơn đã lưu trữ hoặc không còn trong danh sách, thêm đúng khách đó vào danh sách với nhãn "<tên> (đã lưu trữ)", và chọn sẵn (hợp đồng cho giữ nguyên khách đã lưu trữ).
  2. "Tiêu đề": bắt buộc; tối đa 200 ký tự, đếm theo ký tự thật (code point).
  3. "Loại tranh": tùy chọn, chữ tự do, có gợi ý (ví dụ bán thân, toàn thân, chibi, chân dung, minh họa).
  4. "Giá thỏa thuận": ô số tiền và ô đơn vị tiền.
     - `create`: đơn vị tiền chọn từ `list_currencies` giao với bảng số chữ số lẻ; mặc định là `VND` nếu có, không thì mã đầu tiên.
     - `edit`: đơn vị tiền **không đổi được** (hợp đồng: đơn vị tiền cố định từ lúc tạo), hiện dạng chữ cạnh ô số tiền, và form luôn gửi đúng đơn vị tiền cũ.
  5. "Hạn giao": tùy chọn, ô ngày của hệ thống (`<input type="date">`), có cách xóa để về "không có hạn".
  6. "Mô tả": tùy chọn, nhiều dòng.
  7. "Liên kết tham khảo": tùy chọn, nhiều dòng, **mỗi dòng một liên kết**.
- **Kiểm trước khi gửi**, trong phân khu logic, trả `rejected_input` kèm lỗi từng ô. Luật sao từ hợp đồng, trừ những điều ghi `[UI-ONLY]`:
  - `[UI-ONLY]` bỏ khoảng trắng ở hai đầu mọi ô chữ trước khi kiểm và gửi (như `client_form`);
  - chưa chọn khách: "Chọn khách hàng";
  - tiêu đề rỗng sau khi bỏ khoảng trắng: "Nhập tiêu đề đơn hàng" (Data Schema 8.0.0, CT-3: not blank); quá 200 ký tự: lỗi nêu giới hạn;
  - số tiền: luật đọc số ở trên; `amount_minor >= 0` và trong ±(2^53−1) là luật hợp đồng, phần cách viết là `[UI-ONLY]`;
  - `[UI-ONLY]` **văn bản tùy chọn để trống thì gửi `null`**: "Loại tranh", "Mô tả" rỗng sau khi bỏ khoảng trắng → `null` (quyết định của Project Owner 2026-09-28, CT-3). Hạn giao để trống → `null`;
  - `[UI-ONLY]` liên kết tham khảo: tách theo dòng, bỏ khoảng trắng hai đầu từng dòng, bỏ dòng rỗng; không kiểm dạng URL, vì hợp đồng chỉ ghi `list[string]`. Không có dòng nào thì gửi `[]`;
  - đơn vị tiền phải thuộc danh sách của `list_currencies` (hợp đồng: `currency in supported_currencies`); với form này điều đó luôn đúng, vì chỉ chọn được từ danh sách.
- **Vị trí nút và focus:** như `client_form` (hàng "Lưu", "Hủy" ngay dưới tiêu đề; lỗi nhập thì focus tới ô lỗi đầu tiên theo thứ tự ở trên).
- **Không có khách nào đang hoạt động** (chế độ `create`): thay form bằng trạng thái rỗng "Chưa có khách hàng đang hoạt động. Thêm khách hàng trước khi tạo đơn.", kèm nút "Thêm khách hàng" mở `client_form(create)` (§7.2, nguyên tắc 6).
- **Gửi:** `create_commission` hoặc `edit_commission`, thân `{ "commission_input": … }`. Trong lúc gửi, "Lưu" bị vô hiệu.
  - 201 hoặc 200: chuyển sang `commission_detail`, kèm "Đã thêm đơn hàng" hoặc "Đã lưu thay đổi".
  - 400: thông báo chung ở đầu form ("Máy chủ không nhận dữ liệu này"), giữ nguyên dữ liệu. Không đọc `error_body.details`.
  - 404 khi tạo: "Không tìm thấy khách hàng đã chọn. Hãy chọn lại." và tải lại danh sách khách. 404 khi sửa: "Không tìm thấy đơn hàng hoặc khách hàng đã chọn." Hai mã lỗi như nhau (`ERR_NOT_FOUND`) nên giao diện không phân biệt; trong dùng bình thường không xảy ra, vì không có thao tác xóa.
  - 409: "Khách hàng đã chọn đã được lưu trữ. Hãy chọn khách khác." và tải lại danh sách khách. Hợp đồng còn trả 409 khi đổi đơn vị tiền, nhưng form không cho đổi, nên đường bình thường không gây ra.
  - 500, không tới được: thông báo, giữ nguyên dữ liệu, cho gửi lại.
- **Nhãn phải xử lý:** `create_commission`: 201, 400, 404, 409, 500; `edit_commission`: 200, 400, 404, 409, 500; `get_commission`: như `commission_detail`; `list_clients`: 200, 500; `list_currencies`: 200; mọi lời gọi: không tới được, vi phạm hợp đồng.
- Tiêu đề trùng được phép. V1 không chặn rời form khi có thay đổi chưa lưu (V2).

### Điều hướng của D2

- Tham số có kiểu trong `screens/navigation.ts`: `commission_detail` nhận `commission_id`; `commission_form` nhận `create`, hoặc `edit` kèm `commission_id`.
- Luồng:
  - vùng điều hướng "Đơn hàng" → `commission_list`;
  - `commission_list` → bấm đơn → `commission_detail`; → "Thêm đơn hàng" → `commission_form(create)` → lưu → `commission_detail(id mới)` kèm "Đã thêm đơn hàng";
  - `commission_detail` → "Sửa" → `commission_form(edit)` → lưu → `commission_detail` kèm "Đã lưu thay đổi";
  - "Hủy" ở form về trang trước (`commission_detail` nếu sửa, `commission_list` nếu thêm); "Quay lại danh sách" ở chi tiết về `commission_list`;
  - `commission_form(create)` khi không có khách → "Thêm khách hàng" → `client_form(create)`. Đây là lối sang trang của D1 duy nhất; D1 không đổi.
- Mục điều hướng "Đơn hàng" được đánh dấu đang mở ở cả ba trang của D2.

### Luật phủ của kịch bản bấm thử ở D2 (iWCA I6.3)

Như D1:
- `rejected_input` cho thao tác lưu của `commission_form`, ở **cả hai** chế độ; ít nhất một bước có tiêu đề chỉ gồm khoảng trắng, và một bước có số tiền sai cách viết;
- `ok` cho mọi thao tác, gồm cả số tiền USD có phần lẻ và một đơn có đủ mọi ô tùy chọn;
- ít nhất một bước `unreachable` cho **mỗi** trang;
- không đòi `rejected_system`: 404 và 409 không gây ra được bằng thao tác bình thường; kiểm thử dựng trang (I5) chứng minh chúng hiện đúng.

## Chặng D3 — Tiến độ (làm lại I1 ngày 2026-09-29, trước phiên 20)

Căn cứ: Data Schema 8.0.1 (`update_progress`: `stage_change`, `stage_catalog`, `progress_state`, `progress_board`, `progress_history`, `stage_options`; `types.stage_kind`, `types.progress_entry_record`), API Contract 4.0.0 (`update_progress`; cùng `list_commissions` của `manage_commission`).

### Lời gọi của workflow giao diện `update_progress`

| Lời gọi | Dùng ở | Nhãn phải xử lý (hợp đồng) |
|---|---|---|
| `get_stage` (`GET /commissions/{commission_id}/stage`) | `commission_detail` (phần Tiến độ), `stage_change` | 200, 404, 500 |
| `get_stage_history` (`GET /commissions/{commission_id}/stage/history`) | `commission_detail` (phần Tiến độ) | 200, 404, 500 |
| `change_stage` (`PUT /commissions/{commission_id}/stage`, thân `{ "stage_change": … }`) | `stage_change` | 200, 400, 404, 409, 500 |
| `get_board` (`GET /progress/board`) | `progress_board` | 200, 500 |
| `list_stages` (`GET /progress/stages`) | `progress_board`, `stage_change` | 200 |
| `list_commissions` (`GET /commissions`) | `progress_board` (tiêu đề, hạn giao) | 200, 500 |

Mọi lời gọi còn phải xử lý "không tới được" và "vi phạm hợp đồng", như D1, D2. `list_commissions` là bản riêng trong Adapters của `update_progress`, không import `manage_commission` của giao diện (R2). Một thao tác gồm nhiều lời gọi thì là **một** thao tác với **một** kết quả, như D2.

### Luật trình bày chung của D3 (quyết định của `update_progress`, đều `[UI-ONLY]`)

- **Tên giai đoạn.** Mã giai đoạn của hợp đồng là tiếng Anh kỹ thuật; họa sĩ thấy tên tiếng Việt (§7.2, nguyên tắc 3). Configs của workflow giữ bảng tên:

  | Mã | Tên hiện |
  |---|---|
  | `queued` | Chờ bắt đầu |
  | `sketch` | Phác thảo |
  | `lineart` | Lên nét |
  | `coloring` | Tô màu |
  | `rendering` | Hoàn thiện chi tiết |
  | `final_review` | Duyệt lần cuối |
  | `revision` | Sửa theo yêu cầu |
  | `completed` | Đã vẽ xong |
  | `on_hold` | Tạm dừng |
  | `delivered` | Đã giao |
  | `cancelled` | Đã hủy |

  Mã không có trong bảng (cấu hình backend đổi) thì hiện đúng mã đó. **Thứ tự** giai đoạn luôn lấy từ `list_stages`, không từ bảng tên.
- **Giai đoạn "khép lại":** giai đoạn có `kind` là `finished` hoặc `cancelled`. Hợp đồng: đơn ở giai đoạn khép lại không đổi giai đoạn được nữa.
- **Đơn chưa từng đặt giai đoạn** (`updated_at: null`, hoặc không có trong `progress_board`) được tính là giai đoạn đầu của danh mục, đúng hợp đồng.
- **Ngày giờ** (`changed_at`, `updated_at`): như `client_detail`. **Hạn giao:** như D2 (`dd/mm/yyyy`, cắt từ chuỗi). Workflow này giữ bản riêng của các cách định dạng đó (R2).
- **Lịch sử giai đoạn:** hợp đồng trả cũ nhất trước; giao diện hiện **mới nhất trước**.
- **`list_stages` rỗng** là vi phạm hợp đồng (chốt ngày 2026-09-29, audit phiên 20): hợp đồng luôn nói tới "giai đoạn đầu của danh mục", nên danh mục phải có ít nhất một giai đoạn.

### Chi tiết trang `progress_board` (D3)

- **Mở từ:** mục "Tiến độ" của vùng điều hướng.
- **Khi mở, và khi bấm "Tải lại":** `list_stages`, `get_board`, `list_commissions`, là một thao tác.
- **Hiện:** mỗi giai đoạn **có ít nhất một đơn** là một nhóm, theo đúng thứ tự của `list_stages`. Tiêu đề nhóm là tên giai đoạn kèm số đơn, ví dụ "Phác thảo (2)". Nhóm rỗng không hiện (§7.2, nguyên tắc 2).
  - Đơn có mục trong `progress_board` nằm ở nhóm của `current_stage`. Đơn không có mục nằm ở nhóm giai đoạn đầu.
  - Mục có `current_stage` không có trong `list_stages` thì nằm ở một nhóm cuối, tên "Giai đoạn khác: <mã>".
  - Mục của `progress_board` mà không có trong `list_commissions` thì bỏ qua (không xảy ra ở V1, vì không có thao tác xóa đơn).
- **Mỗi đơn hiện:** tiêu đề (dòng chính); dòng phụ là hạn giao ("Hạn giao dd/mm/yyyy" hoặc "Không có hạn").
- **Thứ tự trong nhóm:** hạn giao sớm nhất trước, đơn không có hạn xếp cuối; cùng hạn thì `updated_at` mới nhất trước, rồi `commission_id`.
- **Thao tác:** bấm một đơn mở `commission_detail(commission_id)`. Trang **không có** hành động chính riêng; hàng nút dưới tiêu đề chỉ có "Tải lại" (§7.2, nguyên tắc 7: hàng nút vẫn có mặt).
- **Trạng thái rỗng** (chưa có đơn nào): "Chưa có đơn hàng nào", kèm nút "Thêm đơn hàng" mở `commission_form(create)`.
- **Nhãn phải xử lý:** 200, 500, không tới được, vi phạm hợp đồng, cho cả ba lời gọi.

### Sửa trang `commission_detail` (D3)

Trang có thêm một phần **"Tiến độ"**, nằm dưới các thông tin của đơn. Phần này dùng Routers của `update_progress`, tải **riêng** với phần đơn hàng (một thao tác gồm `get_stage` và `get_stage_history`). Hai phần không ghép dữ liệu với nhau (I1.5).
- **Hiện:**
  - "Giai đoạn hiện tại": tên giai đoạn; kèm "cập nhật lúc <ngày giờ>", hoặc "chưa cập nhật lần nào" khi `updated_at` là `null`;
  - "Lịch sử": mỗi dòng là "<từ> → <đến>" (dòng đầu tiên của đơn, khi `from_stage` là `null`: "Bắt đầu: <đến>"), ngày giờ đổi, và ghi chú nếu có; mới nhất trước. Lịch sử rỗng: "Chưa đổi giai đoạn lần nào".
- **Thao tác:** "Đổi giai đoạn" là hành động **phụ** (hành động chính vẫn là "Sửa"), đặt trong hàng nút dưới tiêu đề trang, sau "Sửa". Nút mở `stage_change(commission_id)`.
  - Giai đoạn hiện tại đã khép lại: không có nút "Đổi giai đoạn"; phần Tiến độ ghi `Đơn đang ở giai đoạn "<tên>", không đổi giai đoạn được nữa.` (sửa ngày 2026-09-29, audit phiên 20: câu cũ "Đơn đã <tên>" ghép với tên "Đã giao" thành "Đơn đã Đã giao")
  - Trong lúc phần Tiến độ chưa tải xong hoặc tải lỗi: không có nút "Đổi giai đoạn".
- **Lỗi của phần Tiến độ** (500, không tới được, vi phạm hợp đồng, 404): hiện trong chính phần đó, kèm nút "Thử lại" của riêng phần đó. Phần thông tin đơn không bị ảnh hưởng.
- Trang nhận thêm **thông báo chuyển trang** "Đã đổi giai đoạn sang <tên>." khi quay về từ `stage_change`.

### Chi tiết trang `stage_change` (D3)

- **Tham số:** `commission_id`, và `title` (tiêu đề đơn, để hiện, do `commission_detail` trao; không gọi lại `get_commission`).
- **Tiêu đề trang:** "Đổi giai đoạn"; dưới đó là tiêu đề đơn.
- **Khi mở:** `list_stages` và `get_stage`, là một thao tác. 404: "Không tìm thấy đơn hàng này", kèm nút quay lại.
  - Giai đoạn hiện tại đã khép lại: không có form; hiện `Đơn đang ở giai đoạn "<tên>", không đổi giai đoạn được nữa.` kèm nút quay lại.
- **Các ô:**
  1. "Giai đoạn hiện tại": chữ, không sửa được;
  2. "Giai đoạn mới": chọn từ `list_stages`, theo đúng thứ tự, **trừ** giai đoạn hiện tại (hợp đồng: đổi sang chính giai đoạn hiện tại bị từ chối); có lựa chọn đầu "Chọn giai đoạn" nghĩa là chưa chọn; bắt buộc;
  3. "Ghi chú": tùy chọn, nhiều dòng.
- **Kiểm trước khi gửi**, trong phân khu logic:
  - chưa chọn giai đoạn: "Chọn giai đoạn mới";
  - `[UI-ONLY]` ghi chú bỏ khoảng trắng hai đầu; rỗng thì gửi `null`.
- **Xác nhận khi chọn giai đoạn khép lại** (§7.2, nguyên tắc 5: thao tác không quay lại được). Bấm "Lưu" với giai đoạn mới là `finished` hoặc `cancelled` thì **chưa gửi**, mà hiện ngay trong trang một khung cảnh báo: "Sau khi chuyển sang \"<tên>\", đơn này không đổi giai đoạn được nữa." kèm hai nút "Xác nhận" và "Quay lại".
  - "Xác nhận" gửi đi; "Quay lại" đóng khung, giữ nguyên dữ liệu.
  - **Không** dùng hộp thoại của hệ thống hay của trình duyệt (`window.confirm`): khung nằm trong trang, dùng component của kit.
  - Giai đoạn mới không khép lại thì gửi ngay, không hỏi.
- **Vị trí nút và focus:** như các form khác (hàng "Lưu", "Hủy" dưới tiêu đề; lỗi nhập thì focus tới ô lỗi đầu tiên). Khi khung xác nhận hiện, focus chuyển tới nút "Xác nhận".
- **Gửi:** `change_stage`, thân `{ "stage_change": { "to_stage": …, "note": … } }`. Trong lúc gửi, "Lưu" và "Xác nhận" bị vô hiệu.
  - 200: về `commission_detail(commission_id)` kèm "Đã đổi giai đoạn sang <tên>."
  - 400: thông báo chung "Máy chủ không nhận dữ liệu này", giữ dữ liệu. Không đọc `details`.
  - 404: "Không tìm thấy đơn hàng này."
  - 409: "Không đổi được giai đoạn: đơn đã được đổi sang giai đoạn khác hoặc đã khép lại. Hãy mở lại trang." Không tự tải lại.
  - 500, không tới được: thông báo, giữ dữ liệu, cho gửi lại.
- **"Hủy"** về `commission_detail(commission_id)`.

### Điều hướng của D3

- Tham số có kiểu: `stage_change` nhận `commission_id` và `title`. `progress_board` không có tham số.
- Luồng:
  - vùng điều hướng "Tiến độ" → `progress_board` → bấm đơn → `commission_detail`;
  - `commission_detail` → "Đổi giai đoạn" → `stage_change` → lưu → `commission_detail` kèm thông báo; "Hủy" → `commission_detail`;
  - `progress_board` rỗng → "Thêm đơn hàng" → `commission_form(create)`.
- Mục "Tiến độ" được đánh dấu đang mở ở `progress_board`. Ở `stage_change`, mục "Đơn hàng" được đánh dấu đang mở, vì trang này là một bước của trang chi tiết đơn.

### Luật phủ của kịch bản bấm thử ở D3 (iWCA I6.3)

- `ok` cho mọi thao tác, gồm:
  - đổi sang một giai đoạn thường (không hỏi xác nhận);
  - đổi sang "Đã giao" qua khung xác nhận, sau đó nút "Đổi giai đoạn" biến mất ở `commission_detail`;
  - bấm "Quay lại" ở khung xác nhận (không gửi gì).
- `rejected_input`: lưu khi chưa chọn giai đoạn.
- Ít nhất một bước `unreachable` cho mỗi trang (`progress_board`, `stage_change`, và phần Tiến độ của `commission_detail`).
- Không đòi `rejected_system`: 404 và 409 không gây ra được bằng thao tác bình thường; kiểm thử dựng trang chứng minh chúng hiện đúng.
- Kịch bản `commission_detail` (D2) được bổ sung các bước của phần Tiến độ; ba kịch bản D2 chạy lại đủ.

## Chặng D4 — Thanh toán (làm lại I1 ngày 2026-09-29, trước phiên 22)

Căn cứ: Data Schema **9.0.0** (`record_payment`: `payment_input`, `payment_record`, `payment_list`, `commission_balance`; `formats.not_blank`, `types.money`, `formats.timestamp`), API Contract 4.0.0 (`record_payment`). Bản 9.0.0 (CT-4, duyệt 2026-09-30) thêm luật `method` not blank. `record_payment` tạm ở `đang_triển_khai` cho tới khi backend áp dụng (BE-7). Giao diện đã kiểm luật này từ D4, nên không phải chờ backend.

### Lời gọi của workflow giao diện `record_payment`

| Lời gọi | Dùng ở | Nhãn phải xử lý (hợp đồng) |
|---|---|---|
| `get_balance` (`GET /payments/balance/{commission_id}`) | `commission_detail` (phần Thanh toán), `payment_list`, `payment_form` | 200, 404, 409 (`ERR_OUT_OF_RANGE`), 500 |
| `list_for_commission` (`GET /payments?commission_id=…`) | `payment_list` | 200, 404, 500 |
| `record` (`POST /payments`, thân `{ "commission_id": …, "payment_input": … }`) | `payment_form` | 201, 400, 404, 409 (`ERR_OUT_OF_RANGE`), 422 (`ERR_CURRENCY_MISMATCH`), 500 |
| `void_payment` (`PUT /payments/{payment_id}/void`) | `payment_list` | 200, 404, 409 (`ERR_CONFLICT`), 500 |

Mọi lời gọi còn phải xử lý "không tới được" và "vi phạm hợp đồng". Một thao tác nhiều lời gọi là **một** thao tác với **một** kết quả, như D2, D3.

### Luật trình bày chung của D4 (quyết định của `record_payment`, đều `[UI-ONLY]`)

- **Số tiền:** đọc và hiện đúng luật của D2 (mục "Số tiền"). Workflow này giữ **bản riêng** của bảng chữ số lẻ và của cách đọc, cách hiện (R2). Số âm (chỉ có ở `outstanding`) hiện với dấu trừ.
- **Chiều tiền** (`direction`): `incoming` "Nhận tiền", `refund` "Hoàn tiền cho khách".
- **Loại khoản** (`kind`): `deposit` "Tiền cọc", `milestone` "Thanh toán theo đợt", `final` "Thanh toán cuối", `tip` "Tiền tip", `other` "Khác".
- **Số dư** (`commission_balance`), ba dòng:
  - "Giá thỏa thuận": `agreed`;
  - "Đã nhận": `received_net`, tức tiền nhận trừ tiền hoàn, gồm cả tiền tip;
  - "Còn phải thu": `outstanding`. Bằng 0 thì hiện "Đã thu đủ". Âm thì hiện "Đã thu dư <số tiền dương>".
- **Ngày giờ nhận tiền** (`paid_at`): hiện `HH:mm dd/mm/yyyy` theo giờ của máy, như các ngày giờ khác.
- **Danh sách khoản:** giữ đúng thứ tự hợp đồng hứa (mới nhất trước theo `paid_at`).
- **Khoản đã hủy:** vẫn hiện, đánh dấu "Đã hủy", chữ phụ; không có nút hủy.

### Sửa trang `commission_detail` (D4)

Thêm phần **"Thanh toán"** dưới phần "Tiến độ", cùng cách làm với phần Tiến độ:
- dùng Routers của `record_payment`, với hook riêng;
- tải riêng bằng `get_balance`, lỗi riêng, "Thử lại" riêng;
- không ghép dữ liệu với phần khác.

Phần này hiện ba dòng số dư. Hàng nút dưới tiêu đề trang thêm "Thanh toán" (hành động phụ), đứng sau "Đổi giai đoạn" và trước "Quay lại danh sách". Nút mở `payment_list(commission_id, title)` và luôn có mặt, kể cả khi phần Thanh toán tải lỗi.

`get_balance` trả 409 (`ERR_OUT_OF_RANGE`) thì phần này hiện "Số dư của đơn này vượt giới hạn tính toán." Trong dùng bình thường điều này không xảy ra.

### Chi tiết trang `payment_list` (D4)

- **Tham số:** `commission_id`, `title`. **Tiêu đề trang:** "Thanh toán"; dưới đó là tiêu đề đơn.
- **Hàng nút:** "Ghi khoản thanh toán" (hành động chính) mở `payment_form`; "Quay lại đơn hàng" về `commission_detail`.
- **Khi mở, và khi bấm "Tải lại":** `get_balance` và `list_for_commission`, là một thao tác. 404: "Không tìm thấy đơn hàng này", kèm nút quay lại.
- **Hiện:** ba dòng số dư; rồi danh sách khoản.
  - Mỗi khoản: dòng chính "<chiều tiền> <số tiền> · <loại khoản>"; dòng phụ "<ngày giờ> · <phương thức>", thêm " · <ghi chú>" nếu có.
  - Khoản đã hủy thêm "Đã hủy".
  - Danh sách rỗng: "Chưa có khoản thanh toán nào", kèm nút "Ghi khoản thanh toán".
- **Hủy một khoản:** mỗi khoản chưa hủy có nút phụ "Hủy khoản này".
  - Bấm nút thì **chưa gửi**, mà hiện khung xác nhận trong trang (`ConfirmPanel`): "Khoản đã hủy không khôi phục được. Số dư sẽ được tính lại không có khoản này." kèm "Xác nhận" và "Quay lại" (§7.2, nguyên tắc 5: hủy không quay lại được). Focus tới "Xác nhận".
  - "Xác nhận" gửi `void_payment`.
    - 200: tải lại số dư và danh sách, hiện "Đã hủy khoản thanh toán."
    - 409: "Khoản này đã được hủy trước đó.", và tải lại.
    - 404: "Không tìm thấy khoản thanh toán này.", và tải lại.
    - 500, không tới được: thông báo, rồi **lặng lẽ tải lại**; nếu tải lại cũng hỏng thì danh sách đang hiện giữ nguyên. (Cập nhật 2026-09-30 theo phiên 22: agent tải lại sau mọi lần bị từ chối; Orchestrator chấp nhận vì không làm mất dữ liệu đang hiện.)
  - Trong lúc gửi, mọi nút "Hủy khoản này" và "Xác nhận" bị vô hiệu. **Khi khung xác nhận đang mở**, các nút "Hủy khoản này" khác cũng bị vô hiệu, vì khung không nêu tên khoản (cập nhật 2026-09-30 theo phiên 22).
- Trang nhận thông báo chuyển trang "Đã ghi khoản thanh toán." khi quay về từ `payment_form`.

### Chi tiết trang `payment_form` (D4)

- **Tham số:** `commission_id`, `title`. **Tiêu đề trang:** "Ghi khoản thanh toán"; dưới đó là tiêu đề đơn.
- **Khi mở:** `get_balance`, để biết đơn vị tiền của đơn (`agreed.currency`) và biết đơn còn tồn tại. 404: "Không tìm thấy đơn hàng này", kèm nút quay lại. Mã tiền không có trong bảng chữ số lẻ: không có form, hiện "Đơn vị tiền <mã> chưa được hỗ trợ ở giao diện."
- **Các ô**, theo thứ tự trên màn hình:
  1. "Loại giao dịch": chọn chiều tiền; mặc định "Nhận tiền".
  2. "Khoản": chọn loại khoản, có lựa chọn đầu "Chọn khoản"; bắt buộc. Dưới ô có dòng gợi ý cố định: "Tiền tip không làm giảm số còn phải thu."
  3. "Số tiền": ô chữ, đọc theo luật của D2; đơn vị tiền của đơn hiện dạng chữ cạnh ô, **không** chọn được (hợp đồng: đơn vị tiền phải bằng đơn vị tiền của đơn).
  4. "Phương thức": chữ tự do, có gợi ý "Chuyển khoản", "MoMo", "PayPal", "Tiền mặt"; bắt buộc.
  5. "Ngày giờ nhận tiền": ô ngày giờ của hệ thống (`<input type="datetime-local">`); mặc định là thời điểm mở form, **cắt bỏ giây** (không làm tròn lên, để mặc định không vượt thời điểm hiện tại; chỉnh chữ 2026-09-30 theo phiên 22); bắt buộc.
  6. "Ghi chú": tùy chọn, nhiều dòng.
- **Kiểm trước khi gửi**, trong phân khu logic:
  - chưa chọn khoản: "Chọn khoản thanh toán";
  - số tiền: luật đọc của D2. Thêm luật hợp đồng `amount_minor > 0`: số 0 thì lỗi "Số tiền phải lớn hơn 0";
  - phương thức rỗng sau khi bỏ khoảng trắng: "Nhập phương thức thanh toán" (Data Schema 9.0.0: `method` not blank);
  - ngày giờ rỗng: "Chọn ngày giờ nhận tiền";
  - `[UI-ONLY]` bỏ khoảng trắng hai đầu mọi ô chữ; ghi chú rỗng thì gửi `null`;
  - `[UI-ONLY]` **`paid_at`** ghép từ giá trị ô (`YYYY-MM-DDTHH:mm`), thêm `:00`, và **độ lệch múi giờ của máy tại đúng ngày giờ đó** (ví dụ `+07:00`), đúng `formats.timestamp`. Không đổi sang UTC. Ngày trong tương lai được phép, vì hợp đồng không cấm.
  - Thời điểm "bây giờ" dùng cho giá trị mặc định lấy qua một nguồn do Main trao cho workflow, để kiểm thử cố định được. Không gọi đồng hồ rải rác trong Services.
- **Vị trí nút và focus:** như các form khác.
- **Gửi:** `record`, thân `{ "commission_id": …, "payment_input": { direction, kind, amount: { amount_minor, currency }, method, paid_at, note } }`. Trong lúc gửi, "Lưu" bị vô hiệu.
  - 201: về `payment_list` kèm "Đã ghi khoản thanh toán."
  - 400: "Máy chủ không nhận dữ liệu này", giữ dữ liệu. Không đọc `details`.
  - 404: "Không tìm thấy đơn hàng này."
  - 409 (`ERR_OUT_OF_RANGE`): "Không ghi được: với khoản này, số dư của đơn vượt giới hạn tính toán."
  - 422 (`ERR_CURRENCY_MISMATCH`): "Đơn vị tiền không khớp với đơn hàng." Đường bình thường không gây ra, vì form luôn gửi đúng đơn vị tiền của đơn.
  - 500, không tới được: thông báo, giữ dữ liệu, cho gửi lại.
- **"Hủy"** về `payment_list`.

### Điều hướng của D4

- Tham số có kiểu: `payment_list` và `payment_form` cùng nhận `commission_id` và `title`.
- Luồng:
  - `commission_detail` → "Thanh toán" → `payment_list` → "Ghi khoản thanh toán" → `payment_form` → lưu → `payment_list` kèm thông báo;
  - "Hủy" ở form → `payment_list`; "Quay lại đơn hàng" → `commission_detail`.
- Ở cả hai trang, mục điều hướng "Đơn hàng" được đánh dấu đang mở.

### Luật phủ của kịch bản bấm thử ở D4 (iWCA I6.3)

- `ok` cho mọi thao tác, gồm:
  - ghi một khoản cọc;
  - ghi một khoản tip (số còn phải thu không giảm);
  - ghi một khoản hoàn tiền;
  - ghi khoản USD có phần lẻ;
  - hủy một khoản qua khung xác nhận (số dư tính lại);
  - bấm "Quay lại" ở khung xác nhận (không gửi gì);
  - đơn thu dư ("Đã thu dư …").
- `rejected_input`: số tiền 0, phương thức chỉ gồm khoảng trắng, chưa chọn khoản.
- Ít nhất một bước `unreachable` cho `payment_list`, `payment_form` và phần Thanh toán của `commission_detail`.
- Không đòi `rejected_system`: 404, 409, 422 không gây ra được bằng thao tác bình thường. Kiểm thử dựng trang chứng minh chúng hiện đúng.
- Kịch bản `commission_detail` bổ sung các bước của phần Thanh toán.

## Chặng D5 — Thu nhập (làm lại I1 ngày 2026-09-30, trước phiên 24)

Căn cứ: Data Schema **9.0.1** (`view_income_report`: `period_from`, `period_to`, `income_report`; `formats.date`, `formats.timestamp`, `types.money`, `types.currency_code`; luật số nguyên của `clause_a_common.mandatory_rules`), API Contract 4.0.0 (`view_income_report`). Hợp đồng không cần sửa cho D5.

### Lời gọi của workflow giao diện `view_income_report`

| Lời gọi | Dùng ở | Nhãn phải xử lý (hợp đồng) |
|---|---|---|
| `get_income_report` (`GET /reports/income?period_from=YYYY-MM-DD&period_to=YYYY-MM-DD`) | `income_report` | 200, 400 (`ERR_VALIDATION`), 409 (`ERR_OUT_OF_RANGE`), 500 |

Cùng "không tới được" và "vi phạm hợp đồng", như các chặng trước. Đây là lời gọi duy nhất của D5; workflow không gọi địa chỉ nào khác.

### Những điều hợp đồng quy định mà trang phải nói đúng

- **Khoảng thời gian** tính cả hai ngày đầu và cuối. `period_from` sau `period_to` là không hợp lệ.
- **Một khoản thuộc ngày ghi trong `paid_at` của chính nó**, theo độ lệch múi giờ của chính khoản đó, không quy đổi.
- **Mỗi đơn vị tiền một phần riêng. Không quy đổi tiền tệ.**
- `received_net_minor`: tiền nhận trừ tiền hoàn **trong khoảng thời gian**, gồm cả tiền tip và tiền của đơn đã hủy. Có thể âm.
- `refunded_minor`: tổng tiền hoàn **trong khoảng thời gian**, luôn `>= 0`.
- `outstanding_minor`: tổng "còn phải thu" của **mọi đơn chưa hủy** ở đơn vị tiền đó, **tính tới lúc lập báo cáo, không phụ thuộc khoảng thời gian**. Giữ dấu: một đơn thu dư làm tổng giảm, nên tổng có thể âm.
- `by_month`: chỉ những tháng có ít nhất một khoản trong khoảng thời gian, cũ nhất trước.
- `currencies`: mọi đơn vị tiền có khoản trong khoảng thời gian hoặc có đơn còn phải thu, theo thứ tự mã. Có thể rỗng.

### Luật trình bày của D5 (quyết định của `view_income_report`, đều `[UI-ONLY]` trừ khi ghi khác)

- **Số tiền:** hiện đúng luật của D2 (mục "Số tiền"), kể cả mã tiền không có trong bảng chữ số lẻ. Workflow này giữ **bản riêng** của bảng chữ số lẻ và cách hiện (R2). Số âm hiện với dấu trừ ở đầu, ví dụ `-500.000 VND`. D5 không có ô nhập số tiền.
- **Tháng** (`YYYY-MM`): hiện "Tháng M/YYYY", ví dụ `2026-09` → "Tháng 9/2026". Tách thẳng từ chuỗi, không qua `Date`.
- **Ngày** (`period_from`, `period_to`): hiện `dd/mm/yyyy`, tách thẳng từ chuỗi, như hạn giao ở D2.
- **Thời điểm lập** (`generated_at`): hiện `HH:mm dd/mm/yyyy` theo giờ của máy, như các ngày giờ khác.
- Workflow giữ **bản riêng** của các cách định dạng ngày, tháng, ngày giờ (R2).
- **Không lấp tháng trống.** Tháng không có khoản nào thì không hiện, đúng như hợp đồng trả.
- **Không cộng các đơn vị tiền với nhau**, kể cả để làm "tổng cộng".

### Chi tiết trang `income_report` (D5)

- **Mở từ:** mục **"Thu nhập"** của vùng điều hướng, đứng sau "Tiến độ".
- **Tiêu đề trang:** "Thu nhập".
- **Chọn khoảng thời gian:** hai ô ngày của hệ thống (`DateField` của kit): "Từ ngày", "Đến ngày".
  - **Mặc định khi mở trang:** từ ngày 1 tháng 1 của năm hiện tại tới **hôm nay**, theo ngày của máy. "Hôm nay" lấy qua nguồn "bây giờ" do Main trao cho workflow, như D4, để kiểm thử cố định được.
  - Khi mở trang, báo cáo của khoảng mặc định **tự tải**, không cần bấm.
- **Hàng nút dưới tiêu đề:** chỉ có "Xem báo cáo" (hành động chính). Nút này gửi khoảng thời gian đang nhập. Nó cũng là cách tải lại, nên trang không có nút "Tải lại" riêng.
- **Kiểm trước khi gửi**, trong phân khu logic:
  - ô rỗng: "Chọn ngày bắt đầu" hoặc "Chọn ngày kết thúc";
  - giá trị không đúng dạng `YYYY-MM-DD` với năm bốn chữ số, hoặc không phải ngày có thật: "Ngày không hợp lệ". Ô ngày của hệ thống cho gõ năm hơn bốn chữ số, nên phải kiểm;
  - ngày bắt đầu sau ngày kết thúc: lỗi ở ô "Đến ngày": "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu". **Bản sao của luật hợp đồng**, không phải `[UI-ONLY]`. Từ Data Schema 9.0.2 (CT-5, duyệt 2026-10-01) luật nằm trong `type` của `period_to` (`"date (on or after period_from)"`), nên giao diện được kiểm nó theo iWCA §5, nhãn `[CONTRACT]`. Trước đó luật chỉ có trong `description` và đặc tả này đã sai (audit phiên 24 §5.1);
  - lỗi thì không gửi; con trỏ chuyển tới ô lỗi đầu tiên (§7.2, nguyên tắc 4); báo cáo đang hiện (nếu có) giữ nguyên.
- **Hiện**, khi có kết quả:
  - dòng phụ dưới tiêu đề: "Từ dd/mm/yyyy đến dd/mm/yyyy · Lập lúc HH:mm dd/mm/yyyy". Khoảng này lấy từ **kết quả** (`period_from`, `period_to`), không từ ô nhập, để người xem biết báo cáo đang hiện là của khoảng nào dù ô đã bị sửa;
  - với mỗi đơn vị tiền, theo đúng thứ tự hợp đồng trả, một phần có tiêu đề là mã tiền, ví dụ "VND":
    - ba dòng số:
      - "Thực nhận trong kỳ": `received_net_minor`;
      - "Đã hoàn cho khách trong kỳ": `refunded_minor`;
      - "Còn phải thu (mọi đơn chưa hủy, tính tới lúc lập)": `outstanding_minor`, giữ dấu;
    - dòng giải thích cố định, chữ phụ: "Thực nhận đã trừ tiền hoàn, gồm cả tiền tip. Còn phải thu không phụ thuộc khoảng thời gian.";
    - danh sách theo tháng: mỗi dòng "Tháng M/YYYY" và số tiền thực nhận của tháng đó. `by_month` rỗng (đơn vị tiền chỉ có đơn còn phải thu) thì hiện "Không có khoản thanh toán nào trong kỳ." thay cho danh sách.
  - `currencies` rỗng: trạng thái rỗng "Không có khoản thanh toán nào trong kỳ, và không có đơn nào còn phải thu." Không có nút, vì báo cáo không có việc tiếp theo trên trang này.
- **Trong lúc tải:** "Xem báo cáo" bị vô hiệu; báo cáo cũ (nếu có) giữ nguyên tới khi có kết quả mới.
- **Nhãn:**
  - 200: thay báo cáo cũ bằng báo cáo mới.
  - 400: "Máy chủ không nhận khoảng thời gian này." Không đọc `details`. Bình thường không xảy ra, vì giao diện kiểm trước.
  - 409 (`ERR_OUT_OF_RANGE`): "Tổng thu nhập vượt giới hạn tính toán, không lập được báo cáo." Bình thường không xảy ra.
  - 500, không tới được, vi phạm hợp đồng: thông báo lỗi như các trang khác. Báo cáo cũ (nếu có) **bị bỏ**, không hiện cạnh thông báo lỗi, để không ai tưởng số cũ là số mới. Bấm "Xem báo cáo" để thử lại.
- **Không có thao tác ghi**, nên không có thông báo chuyển trang, không có xác nhận.
- **Chấp nhận theo phiên 24** (audit phiên 24 §4): dòng "Từ … đến … · Lập lúc …" nằm ở đầu phần báo cáo, dưới hai ô ngày, và mất đi cùng báo cáo khi tải lỗi; Routers có hai lối vào (`defaultPeriod`, `viewIncomeReport`) để tải lỗi vẫn giữ hai ngày mặc định trong ô; năm 0000 là ngày không có thật (khớp backend).

### Điều hướng của D5

- `income_report` không có tham số. Không trang nào khác mở nó ngoài vùng điều hướng, và nó không mở trang nào khác.
- Vùng điều hướng có bốn mục: "Khách hàng", "Đơn hàng", "Tiến độ", "Thu nhập". Ba mục cũ giữ nguyên vị trí.

### Luật phủ của kịch bản bấm thử ở D5 (iWCA I6.3)

- **Dữ liệu mẫu** phải có: khoản ở ít nhất hai tháng; một khoản hoàn tiền; một khoản tip; một đơn đã hủy có khoản đã nhận; một đơn USD có phần lẻ; một đơn thu dư; một đơn còn phải thu nhưng không có khoản nào trong kỳ. Agent chọn dùng hoặc mở rộng dữ liệu mẫu hiện có, và ghi rõ.
- `ok`:
  - chọn một khoảng cố định rồi "Xem báo cáo": hai phần VND và USD, danh sách theo tháng đúng;
  - thu hẹp khoảng thời gian: số trong kỳ đổi, "Còn phải thu" **không đổi**;
  - khoảng thời gian không có khoản nào: phần đơn vị tiền chỉ còn "Còn phải thu" và câu "Không có khoản thanh toán nào trong kỳ.".
- `rejected_input`: ngày bắt đầu sau ngày kết thúc; một ô ngày để trống.
- Ít nhất một bước `unreachable`: tắt backend rồi "Xem báo cáo", sau đó bật lại và xem được.
- **Ảnh bằng chứng không được phụ thuộc ngày thật.** Chụp sau khi đã nhập khoảng thời gian cố định, không chụp báo cáo của khoảng mặc định.
- Không đòi `rejected_system`: 400 và 409 không gây ra được bằng thao tác bình thường. Kiểm thử dựng trang chứng minh chúng hiện đúng.
- Trạng thái rỗng (`currencies` rỗng) chứng minh bằng kiểm thử dựng trang. Kịch bản bấm thử có thể thêm nếu dữ liệu mẫu cho phép.

### Ghi chú

- Ô ngày hiện kiểu tháng/ngày/năm trong ứng dụng thật, vì Electron dùng ngôn ngữ `en-US` (DSK-15). D5 dùng lại `DateField` như D2, nên sẽ được sửa cùng lúc khi làm DSK-15 ở phía desktop. Giá trị gửi đi vẫn đúng dạng `YYYY-MM-DD`.
- Ở máy dùng múi giờ Việt Nam, "ngày của khoản" theo hợp đồng trùng với ngày theo giờ máy. Ở múi giờ khác thì khoản có thể rơi vào ngày khác với ngày hiện ở `payment_list`; đây là đúng hợp đồng, không vá ở V1.

## Chặng D6 — Nhắc việc (làm lại I1 ngày 2026-10-03, trước phiên 27)

Căn cứ: Data Schema **9.0.2** (`send_reminder`: `reminder_settings_input`, `reminder_settings`, `pending_notifications`, `notification_ack`, `notification_id`; `types.reminder_settings_record`, `types.reminder_notification_record`; `formats.timestamp`, `formats.date`), API Contract 4.0.0 (`send_reminder`; `cross_cutting.reminder_ticker`). Hợp đồng không cần sửa cho D6.

### D6 trải trên hai layer

- **Giao diện (phiên 27):** xem và sửa cài đặt nhắc việc; xem danh sách nhắc việc đang chờ; đánh dấu đã xem.
- **Desktop (phiên sau):** `reminder_ticker` gọi `check_due` theo nhịp và hiện thông báo của Windows. Theo hợp đồng, **chỉ** thành phần này gọi `check_due`; giao diện không bao giờ gọi (§4).
- Hệ quả: trước khi có `reminder_ticker`, trong dùng thật, danh sách đang chờ luôn rỗng. Kịch bản bấm thử và e2e tạo nhắc việc bằng cách để **công cụ kiểm thử** (không phải mã giao diện) gọi thẳng `POST /reminders/checks`.

### Lời gọi của workflow giao diện `send_reminder`

| Lời gọi | Dùng ở | Nhãn phải xử lý (hợp đồng) |
|---|---|---|
| `list_pending` (`GET /reminders/pending`) | `reminder_list` | 200, 500 |
| `acknowledge` (`PUT /reminders/{notification_id}/ack`) | `reminder_list` | 200, 404, 500 |
| `get_settings` (`GET /reminders/settings`) | `reminder_settings` | 200, 500 |
| `edit_settings` (`PUT /reminders/settings`, thân `{ "reminder_settings_input": … }`) | `reminder_settings` | 200, 400, 500 |

Cùng "không tới được" và "vi phạm hợp đồng". Không có lời gọi nào khác; đặc biệt **không** gọi `check_due`.

### Luật trình bày chung của D6 (quyết định của `send_reminder`, đều `[UI-ONLY]` trừ khi ghi khác)

- **Thứ tự danh sách đang chờ:** giữ đúng thứ tự hợp đồng hứa (cũ nhất trước). Không sắp lại.
- **Ngày giờ** (`due_at`, `updated_at`): `HH:mm dd/mm/yyyy` theo giờ máy, như các trang khác. **Ngày** (`deadline`): `dd/mm/yyyy`, cắt từ chuỗi.
- **Mốc nhắc** (`lead`): "`<amount>` ngày" hoặc "`<amount>` giờ".
- **Thứ trong tuần** (`weekday`, ISO 1..7): 1 "Thứ Hai", 2 "Thứ Ba", 3 "Thứ Tư", 4 "Thứ Năm", 5 "Thứ Sáu", 6 "Thứ Bảy", 7 "Chủ nhật".
- **Đơn vị chu kỳ** (`unit` của `periodic`): `days` "ngày", `weeks` "tuần". **Đơn vị mốc nhắc** (`unit` của `lead_times`): `hours` "giờ", `days` "ngày".
- Workflow giữ bản riêng của các cách định dạng này (R2).

### Chi tiết trang `reminder_list` (D6)

- **Mở từ:** mục **"Nhắc việc"** của vùng điều hướng, đứng sau "Thu nhập".
- **Tiêu đề trang:** "Nhắc việc". Dòng chữ phụ cố định, đặt **dưới hàng nút** (nguyên tắc 7: hàng nút ngay dưới tiêu đề; chốt ở audit phiên 27): "Nhắc việc đến hạn sẽ hiện thành thông báo của Windows. Mọi nhắc việc chưa đánh dấu đã xem nằm ở đây."
- **Hàng nút:** "Cài đặt nhắc việc" (hành động chính, mở `reminder_settings`); "Tải lại".
- **Khi mở, và khi bấm "Tải lại":** `list_pending`.
- **Mỗi nhắc việc:**
  - `kind = 'deadline'`: dòng chính "Sắp tới hạn giao: `<title>`"; dòng phụ "Hạn giao `dd/mm/yyyy` · nhắc trước `<mốc>` · đến hạn lúc `HH:mm dd/mm/yyyy`". Bấm dòng chính mở `commission_detail(commission_id)`.
  - `kind = 'periodic_digest'`: dòng chính "Tổng hợp định kỳ: `<open_count>` đơn đang mở"; dòng phụ "`<số đơn trong upcoming>` đơn có hạn giao · đến hạn lúc `HH:mm dd/mm/yyyy`", và nếu `upcoming` không rỗng thì thêm " · sớm nhất: `<title>` (`dd/mm/yyyy`)" lấy phần tử đầu (hợp đồng: sớm nhất trước). Bấm dòng chính mở `commission_list`.
  - Mỗi mục có nút phụ **"Đã xem"** (gọi `acknowledge`).
- **Đã xem:** **không** hỏi xác nhận. Lý do: đánh dấu đã xem không làm mất dữ liệu nào, đơn hàng và cài đặt không đổi; hỏi xác nhận cho từng mục là gánh nặng không tương xứng (§7.2 nguyên tắc 5 chỉ đòi xác nhận cho thao tác khó quay lại **và có hậu quả**).
  - 200: tải lại danh sách, hiện "Đã đánh dấu đã xem."
  - 404: "Nhắc việc này không còn trong danh sách.", và tải lại.
  - 500, không tới được: thông báo; danh sách giữ nguyên. (Chốt ở audit phiên 27: với 500, trang được lặng lẽ đọc lại danh sách như với 404; nếu lần đọc lại cũng hỏng thì danh sách cũ vẫn giữ.)
  - Trong lúc gửi, mọi nút "Đã xem" bị vô hiệu.
- **Trạng thái rỗng:** "Không có nhắc việc nào đang chờ.", kèm nút "Cài đặt nhắc việc".
- Trang nhận thông báo chuyển trang "Đã lưu cài đặt nhắc việc." khi quay về từ `reminder_settings`.

### Chi tiết trang `reminder_settings` (D6)

- **Tiêu đề trang:** "Cài đặt nhắc việc". **Hàng nút:** "Lưu" (chính), "Hủy" (về `reminder_list`).
- **Khi mở:** `get_settings`. Dòng phụ dưới tiêu đề: "Chưa lưu lần nào, đang dùng cài đặt mặc định." khi `updated_at` là `null`; còn lại "Lưu lần cuối lúc `HH:mm dd/mm/yyyy`".
- **Phần "Nhắc định kỳ"** (`periodic`):
  1. ô đánh dấu "Bật nhắc định kỳ" (`enabled`);
  2. "Mỗi": ô số (`every`) và ô chọn đơn vị "ngày" / "tuần" (`unit`);
  3. "Vào lúc": ô giờ của hệ thống (`<input type="time">`, `at_time`, `HH:MM`);
  4. "Vào thứ": ô chọn thứ (`weekday`), **chỉ hiện khi đơn vị là "tuần"**. Đổi đơn vị sang "ngày" thì gửi `weekday: null`; đổi sang "tuần" khi chưa có thứ thì mặc định "Thứ Hai".
  5. dòng gợi ý cố định: "Mỗi lần lưu cài đặt, chu kỳ nhắc định kỳ được tính lại từ lúc lưu." (hợp đồng: lưu lại thì chu kỳ bắt đầu lại).
- **Phần "Nhắc trước hạn giao"** (`deadline`):
  1. ô đánh dấu "Bật nhắc trước hạn giao" (`enabled`);
  2. danh sách "Mốc nhắc" (`lead_times`), mỗi dòng: ô số (`amount`), ô chọn "giờ" / "ngày" (`unit`), nút "Bỏ mốc này" (vô hiệu khi chỉ còn một dòng);
  3. nút "Thêm mốc nhắc" (vô hiệu khi đã có 5 dòng); dòng mới là "1 ngày" nếu chưa có mốc nào dài đúng 24 giờ ("1 ngày" hay "24 giờ"), không thì ô số trống, đơn vị "ngày" (chốt ở audit phiên 27, để nút không tự tạo một mốc trùng).
  4. dòng gợi ý cố định: "Hạn giao tính tới hết ngày đó. Một ngày là 24 giờ."
- **Các ô vẫn sửa được khi phần đó tắt.** Hợp đồng đòi đủ mọi trường hợp lệ dù `enabled` là `false`, nên luật kiểm áp cho cả phần đang tắt.
- **Kiểm trước khi gửi**, trong phân khu logic. Mọi luật dưới đây là **bản sao của `types.reminder_settings_record`** (`[CONTRACT]`):
  - `every`: số nguyên ≥ 1 (và trong khoảng số nguyên an toàn); rỗng: "Nhập số ngày hoặc số tuần"; không phải số nguyên dương: "Nhập một số nguyên từ 1 trở lên";
  - `at_time`: rỗng hoặc sai dạng `HH:MM` (00:00..23:59): "Chọn giờ nhắc";
  - `weekday`: khi đơn vị "tuần" mà chưa chọn: "Chọn thứ trong tuần";
  - mỗi `amount`: để trống: "Nhập thời gian nhắc trước"; không phải số nguyên ≥ 1 (kể cả 0 và số âm): "Nhập một số nguyên từ 1 trở lên"; quá 365 ngày hoặc 8760 giờ: "Mốc nhắc tối đa 365 ngày (8760 giờ)" (chốt ở audit phiên 27);
  - hai mốc cùng độ dài (1 ngày = 24 giờ): lỗi ở mốc trùng sau, hiện dưới ô số của mốc đó: "Mốc nhắc này trùng với một mốc khác";
  - số mốc 1..5 được bảo đảm bằng nút, nên không có câu lỗi riêng;
  - lỗi thì không gửi, con trỏ tới ô lỗi đầu tiên (§7.2, nguyên tắc 4).
- **Gửi:** `edit_settings`, thân `{ "reminder_settings_input": { periodic: { enabled, every, unit, at_time, weekday }, deadline: { enabled, lead_times: [{ amount, unit }] } } }`. Trong lúc gửi, "Lưu" bị vô hiệu.
  - 200: về `reminder_list` kèm "Đã lưu cài đặt nhắc việc."
  - 400: "Máy chủ không nhận cài đặt này", giữ dữ liệu. Không đọc `details`.
  - 500, không tới được: thông báo, giữ dữ liệu, cho gửi lại.

### Điều hướng của D6

- `reminder_list` không có tham số; `reminder_settings` không có tham số.
- Luồng: "Nhắc việc" → `reminder_list` → "Cài đặt nhắc việc" → `reminder_settings` → lưu → `reminder_list` kèm thông báo; "Hủy" → `reminder_list`. Bấm một nhắc việc hạn giao → `commission_detail`; bấm một tổng hợp → `commission_list`.
- Vùng điều hướng có năm mục: "Khách hàng", "Đơn hàng", "Tiến độ", "Thu nhập", "Nhắc việc". Bốn mục cũ giữ nguyên vị trí. Ở `reminder_settings`, mục "Nhắc việc" được đánh dấu đang mở.

### Luật phủ của kịch bản bấm thử ở D6 (iWCA I6.3)

- **Dữ liệu mẫu:** hàm nạp riêng trong công cụ kiểm thử. Nhắc việc hạn giao được tạo bằng cách: tạo đơn có hạn giao là **hôm nay** (ngày máy), lưu cài đặt bật nhắc trước hạn giao với mốc "1 ngày", rồi **công cụ kiểm thử** gọi `POST /reminders/checks`. Nhắc việc tổng hợp định kỳ: nếu tạo được trong chưa tới 70 giây thì đưa vào kịch bản; không thì chỉ chứng minh bằng kiểm thử dựng trang, và ghi lý do.
- `ok`:
  - danh sách đang chờ có ít nhất một nhắc việc hạn giao; bấm dòng chính mở đúng đơn;
  - "Đã xem" một mục: mục biến mất, có thông báo;
  - mở cài đặt mặc định ("Chưa lưu lần nào"); bật nhắc định kỳ theo tuần, chọn thứ và giờ; thêm một mốc nhắc "12 giờ"; lưu; mở lại thấy đúng giá trị và "Lưu lần cuối lúc …";
  - đổi đơn vị chu kỳ sang "ngày": ô "Vào thứ" biến mất.
- `rejected_input`: "Mỗi" để trống hoặc 0; hai mốc trùng độ dài (ví dụ "1 ngày" và "24 giờ"); mốc 366 ngày.
- Ít nhất một bước `unreachable` cho `reminder_list` và `reminder_settings`.
- Không đòi `rejected_system`: 400, 404 không gây ra được bằng thao tác bình thường. Kiểm thử dựng trang chứng minh chúng hiện đúng.
- **Ảnh bằng chứng có ngày** (hạn giao là hôm nay, `due_at`, "Lưu lần cuối") thay đổi theo ngày chạy. Chấp nhận, vì ảnh được chụp lại mỗi lần chạy có runner; kịch bản ghi rõ điều này.

## Chặng E — Sao lưu (làm lại I1 ngày 2026-10-07, trước phiên 34)

Căn cứ: Data Schema **9.0.3** (`backup_data`: `backup_request`, `backup_archive`; `types.backup_request_record`, `types.backup_archive_record`, `types.file_path`, `formats.timestamp`), API Contract 4.0.0 (`backup_data.create_backup`; `cross_cutting.native_dialogs.pick_folder`; `endpoint_forms.ipc`). Hợp đồng không cần sửa cho chặng E.

### Chặng E trải trên ba layer

- **Backend (phiên 32, xong):** `create_backup` ghi tệp `.ctbackup` vào thư mục đích, không bao giờ ghi đè; `prepare_restore` kiểm một tệp sao lưu.
- **Desktop (phiên 33, xong):** `invoke` trong bridge; `native_dialogs.pick_folder` mở hộp thoại chọn thư mục của Windows, modal với cửa sổ chính, tiêu đề "Chọn thư mục".
- **Giao diện (phiên 34):** trang `backup`.
- Giao diện **không** gọi `prepare_restore` (§4: chỉ `restore_data` gọi). Tiêu chí của chặng E ("tệp đó qua được `prepare_restore`") được chứng minh bằng **công cụ kiểm thử** gọi thẳng endpoint đó, như D6 làm với `check_due`.

### Lời gọi của workflow giao diện `backup_data`

| Lời gọi | Hình thức | Dùng ở | Kết quả phải xử lý |
|---|---|---|---|
| `native_dialogs.pick_folder` | `ipc`: `invoke('dialog:pick-folder', {})` qua `ipc_bridge` | `backup` | 200 `{ canceled, path }`; Promise bị từ chối; câu trả lời sai hình dạng |
| `create_backup` | `http`: `POST /backups`, thân `{ "backup_request": { "destination_dir": <path>, "purpose": "manual" } }` | `backup` | 201, 400, 500 |

Cùng "không tới được" và "vi phạm hợp đồng" cho `create_backup`. Không có lời gọi nào khác.

**Kiểm hình dạng câu trả lời của `pick_folder`** (bản sao của hợp đồng, `[CONTRACT]`): `{ status: 200, body: { canceled: boolean, path: string|null } }`, với `canceled: true` đi cùng `path: null`, và `canceled: false` đi cùng `path` là chuỗi không rỗng. Lệch bất kỳ điều nào, hay `status` khác 200, là vi phạm hợp đồng. Giao diện không tự kiểm `path` có tuyệt đối không: đường dẫn do hệ điều hành trao, và backend kiểm `file_path` (400 nếu sai).

**`purpose` luôn là `'manual'`** (`[CONTRACT]`: `'pre_restore'` chỉ dành cho `restore_data`).

### Luật trình bày của chặng E (quyết định của `backup_data`, đều `[UI-ONLY]` trừ khi ghi khác)

- **Dung lượng** (`size_bytes`, là dung lượng của chính tệp sao lưu): dưới 1024 byte thì "`<n>` byte"; dưới 1024 × 1024 thì KB, một chữ số thập phân; còn lại MB, một chữ số thập phân. Cơ số 1024, dấu thập phân là dấu phẩy, ví dụ "12,4 KB", "3,0 MB".
- **Lúc tạo** (`created_at`): `HH:mm dd/mm/yyyy` theo giờ máy, như các trang khác.
- **Đường dẫn tệp** hiện nguyên văn, xuống dòng được ở bất kỳ ký tự nào, để đường dẫn dài của Windows không tràn khung.
- Không hiện `sha256` hay `app_version` (§7.2, nguyên tắc 2).
- Workflow giữ bản riêng của cách định dạng ngày giờ (R2).

### Chi tiết trang `backup` (chặng E)

- **Mở từ:** mục **"Sao lưu"** của vùng điều hướng, đứng sau "Nhắc việc". Không tham số.
- **Tiêu đề trang:** "Sao lưu dữ liệu".
- **Hàng nút:** một nút duy nhất, **"Tạo bản sao lưu"** (hành động chính).
- **Dòng chữ phụ cố định**, đặt dưới hàng nút: "Bản sao lưu là một tệp chứa toàn bộ dữ liệu của ứng dụng. Nên lưu ở ổ đĩa khác hoặc ổ USB, để vẫn còn dữ liệu nếu máy hỏng."
- **Khi mở trang:** không gọi gì. Trang không nhớ lần sao lưu trước, cũng không nhớ thư mục đã chọn (`native_dialogs` không giữ gì; V1 không có nơi lưu tùy chọn của giao diện).
- **Bấm "Tạo bản sao lưu"**, một luồng hai bước:
  1. Gọi `pick_folder`. Nút bị vô hiệu từ lúc bấm tới khi xong cả luồng, nên bấm liên tiếp chỉ mở một hộp thoại và gửi nhiều nhất một yêu cầu.
     - `canceled: true`: dừng. Không gửi gì, không hiện thông báo mới; trang giữ nguyên những gì đang hiện.
     - Promise bị từ chối: "Không mở được hộp thoại chọn thư mục. Hãy thử lại." Không gửi gì.
     - Sai hình dạng: câu "vi phạm hợp đồng" chung của layer. Không gửi gì.
  2. Có `path`: hiện trạng thái "Đang tạo bản sao lưu…", gọi `create_backup` với `destination_dir = path`.
     - 201: thông báo "Đã tạo bản sao lưu." và một khung kết quả gồm ba dòng: "Tệp: `<archive_path>`", "Dung lượng: `<dung lượng>`", "Tạo lúc: `HH:mm dd/mm/yyyy`".
     - 400: "Không dùng được thư mục này. Hãy chọn thư mục khác." Không đọc `details`.
     - 500: "Không ghi được tệp sao lưu vào thư mục này. Hãy chọn thư mục khác, hoặc kiểm tra ổ đĩa còn chỗ trống."
     - Không tới được, vi phạm hợp đồng: câu chung của layer.
     - Mọi kết quả không phải 201 đều xóa khung kết quả cũ, nếu có, để họa sĩ không nhầm kết quả cũ là của lần này.
- **Không hỏi xác nhận.** Tạo bản sao lưu không ghi đè gì (backend thêm hậu tố khi trùng tên) và không đổi dữ liệu, nên không thuộc §7.2 nguyên tắc 5.
- **Giới hạn đã biết của V1:** lời gọi `http` có hạn chờ chung 15 s (`scaffold_ui`). Với dữ liệu của một họa sĩ (cỡ KB tới vài MB), chụp và nén mất dưới một giây (đo ở phiên 32: 60 MB mất 0,25 s để chụp). Nếu có lúc hết hạn chờ, trang báo "không tới được" trong khi tệp có thể vẫn được tạo. Chấp nhận ở V1, không thêm hạn chờ riêng.

### Điều hướng của chặng E

- `backup` không có tham số.
- Vùng điều hướng có sáu mục: "Khách hàng", "Đơn hàng", "Tiến độ", "Thu nhập", "Nhắc việc", "Sao lưu". Năm mục cũ giữ nguyên vị trí.

### Luật phủ của kịch bản bấm thử ở chặng E (iWCA I6.3)

- **Hộp thoại trong kịch bản chạy tự động** (e2e và lần chạy có runner): công cụ kiểm thử thay `dialog.showOpenDialog` trong tiến trình chính bằng `electronApp.evaluate`, đúng cách Desktop đã đo và dùng (`native_dialogs-EXP-003`). Không sửa tệp nào của Desktop, không thêm cờ. Thư mục đích là một thư mục tạm của lần chạy, không bao giờ nằm trong `%APPDATA%`.
- **Hộp thoại trong lần Project Owner chạy tay:** hộp thoại thật. Project Owner ghi lại tiêu đề hộp thoại có đúng "Chọn thư mục" không (audit phiên 33 §5.3).
- `ok`:
  - mở trang từ mục "Sao lưu"; tạo bản sao lưu vào một thư mục: thông báo và khung kết quả hiện đúng; đường dẫn tệp nằm trong thư mục đã chọn và có đuôi `.ctbackup`;
  - **công cụ kiểm thử** kiểm tệp đó tồn tại, rồi gọi `POST /backups/restore-preparations` với đường dẫn đó: `is_valid` và `is_compatible` đều `true` (tiêu chí chặng E);
  - tạo bản thứ hai vào cùng thư mục: thành công, tên tệp khác tệp thứ nhất;
  - hủy hộp thoại: không có tệp mới, trang giữ nguyên.
- `rejected_input`: không có, vì trang không có ô nhập. Ghi lý do trong `walkthrough.yaml`.
- `rejected_system`: một bước 400, với hộp thoại thay thế trả về một thư mục không tồn tại. Chỉ có ở lần chạy tự động; lần chạy tay của Project Owner không gây được 400 bằng hộp thoại thật. 500 và Promise bị từ chối được chứng minh bằng kiểm thử dựng trang.
- Ít nhất một bước `unreachable`: tắt backend bằng công cụ có sẵn, bấm "Tạo bản sao lưu", chọn thư mục, thấy câu "không tới được".
- **Ảnh bằng chứng có giờ tạo và đường dẫn tạm** thay đổi theo lần chạy. Chấp nhận, như D6; kịch bản ghi rõ điều này.

## Chặng F — Khôi phục (làm lại I1 ngày 2026-10-09, trước phiên 37)

Căn cứ: Data Schema **10.0.1** (`restore_data`: `archive_path`, `restore_scheduled`, `restore_status`, `restore_cancellation`; `types.pending_restore_record`, `types.file_path`, `formats.timestamp`), API Contract **5.0.0** (`restore_data.request_restore`, `get_restore_status`, `cancel_restore`; `cross_cutting.native_dialogs.open_file`; `endpoint_forms.ipc`; `error_body`). Đặc tả hai pha: `.design/f_restore.md`. Hợp đồng không cần sửa cho phần giao diện.

### Chặng F trải trên ba layer

- **Backend (phiên 32, xong):** `prepare_restore` kiểm tệp sao lưu và đặt tệp chờ; `create_backup` với `purpose: 'pre_restore'` tạo bản sao lưu an toàn. Giao diện không gọi cả hai (§4; `'pre_restore'` chỉ dành cho `restore_data`).
- **Desktop (phiên 35 và 36, xong):** pha 1 (`restore:prepare`, `restore:status`, `restore:cancel`, `native_dialogs.open_file`) và pha 2 (`apply_pending_restore`, `restore_trigger`: áp dụng ở lần mở kế tiếp, trước khi có cửa sổ, rồi hiện hộp thoại kết quả của hệ điều hành).
- **Giao diện (phiên 37):** trang `restore`. Giao diện chỉ làm pha 1. Kết quả của pha 2 do Desktop báo bằng hộp thoại của chính nó, trước khi trang nào được vẽ; giao diện không đọc, không hiện lại kết quả đó.

### Lời gọi của workflow giao diện `restore_data`

Mọi lời gọi đi qua `ipc_bridge` (`invoke(address, argument)`); workflow không dùng `http_client`.

| Lời gọi | Hình thức | Dùng ở | Kết quả phải xử lý |
|---|---|---|---|
| `get_restore_status` | `invoke('restore:status', {})` | `restore` | 200 `{ pending }`; 500; Promise bị từ chối; vi phạm hợp đồng |
| `native_dialogs.open_file` | `invoke('dialog:open-file', { filters: [ { name: 'Bản sao lưu Commission Tracker', extensions: ['ctbackup'] } ] })` | `restore` | 200 `{ canceled, path }`; Promise bị từ chối; vi phạm hợp đồng |
| `request_restore` | `invoke('restore:prepare', { archive_path: <path> })` | `restore` | 200 `pending_restore_record`; 400; 404; 409; 424; 500; 503; Promise bị từ chối; vi phạm hợp đồng |
| `cancel_restore` | `invoke('restore:cancel', {})` | `restore` | 200 `{ canceled }`; 500; Promise bị từ chối; vi phạm hợp đồng |

Không có lời gọi nào khác. Tên bộ lọc và đuôi `ctbackup` (không dấu chấm, cách Electron nhận) là `[UI-ONLY]`; đuôi khớp tệp mà `create_backup` tạo.

**Kiểm hình dạng câu trả lời** (bản sao của hợp đồng, `[CONTRACT]`; ngoài các điều dưới đây là vi phạm hợp đồng):
- Mọi câu trả lời là `{ status, body }` (`endpoint_forms.ipc`). `status` phải là một nhãn của đúng lối vào đó (bảng trên). Nhãn ngoài danh sách là vi phạm hợp đồng.
- Nhãn không phải 200: `body` là `error_body` (`{ code: string, message: string, details: object|null }`), và `code` khớp nhãn theo hợp đồng: 400 `ERR_VALIDATION`, 404 `ERR_NOT_FOUND`, 409 `ERR_INCOMPATIBLE_BACKUP`, 424 và 500 `ERR_STORAGE_IO`, 503 `ERR_SERVICE_UNAVAILABLE`. Không đọc `message`, `details`.
- `pending_restore_record`: `archive_path`, `safety_backup_path` là chuỗi không rỗng; `archive_app_version` là chuỗi; `archive_created_at`, `prepared_at` đúng `formats.timestamp`.
- `restore:status` 200: `{ pending: pending_restore_record | null }`. `restore:cancel` 200: `{ canceled: boolean }`.
- `open_file` 200: như luật của `pick_folder` ở chặng E (`canceled: true` đi cùng `path: null`; `canceled: false` đi cùng `path` là chuỗi không rỗng). Giao diện không tự kiểm `path` có tuyệt đối không.
- Trường thừa trong các đối tượng trên: theo cách các workflow giao diện khác đang làm; ghi rõ trong checkpoint.

### Luật trình bày của chặng F (quyết định của `restore_data`, đều `[UI-ONLY]` trừ khi ghi khác)

- **Thời điểm** (`archive_created_at`, `prepared_at`): `HH:mm dd/mm/yyyy` theo giờ máy, như các trang khác. Workflow giữ bản riêng của cách định dạng (R2).
- **Đường dẫn** hiện nguyên văn, xuống dòng được ở bất kỳ ký tự nào (như chặng E).
- Không hiện `archive_app_version` (§7.2, nguyên tắc 2).
- **Sau mọi lần chuẩn bị hay hủy không thành** (mọi kết quả không phải 200, kể cả Promise bị từ chối và vi phạm hợp đồng), trang gọi lại `restore:status` để khung "Đang chờ khôi phục" hiện đúng sự thật. Lý do: hợp đồng ghi phần lớn nhãn lỗi của `restore:prepare` là "không có gì đang chờ", nhưng 400 giữ nguyên bản ghi cũ, và có trường hợp hiếm 500 cũng giữ (`f_restore.md` §5). Đọc lại thì không phải tự suy. Câu thông báo của lần hỏng giữ nguyên; lần đọc lại chỉ đổi khung. Lần đọc lại cũng hỏng thì ẩn khung, không thêm câu mới.

### Chi tiết trang `restore` (chặng F)

- **Mở từ:** mục **"Khôi phục"** của vùng điều hướng, đứng sau "Sao lưu". Không tham số.
- **Tiêu đề trang:** "Khôi phục dữ liệu".
- **Hàng nút:** **"Chọn tệp sao lưu"** (hành động chính, luôn có); **"Hủy lần khôi phục đang chờ"** (hành động phụ, chỉ hiện khi có lần đang chờ).
- **Dòng chữ phụ cố định**, đặt dưới hàng nút: "Khôi phục thay toàn bộ dữ liệu hiện tại bằng dữ liệu trong một tệp sao lưu. Việc thay diễn ra khi bạn đóng rồi mở lại ứng dụng."
- **Khi mở trang:** gọi `restore:status`. Trong lúc chờ, các nút bị vô hiệu.
  - `pending: null`: dòng "Không có lần khôi phục nào đang chờ."
  - Có `pending`: **khung "Đang chờ khôi phục"**, gồm:
    - "Tệp sao lưu: `<archive_path>`";
    - "Bản sao lưu tạo lúc: `<archive_created_at>`";
    - "Chuẩn bị lúc: `<prepared_at>`";
    - "Bản sao lưu an toàn của dữ liệu trước khi khôi phục: `<safety_backup_path>`";
    - câu "Hãy đóng rồi mở lại ứng dụng để hoàn tất. Dữ liệu bạn nhập từ lúc chuẩn bị tới lúc mở lại sẽ không có trong dữ liệu sau khôi phục."
  - 500: "Không đọc được trạng thái khôi phục. Hãy mở lại trang này." Không hiện khung; nút "Chọn tệp sao lưu" vẫn dùng được (một lần chuẩn bị mới thay mọi lần cũ).
  - Promise bị từ chối: "Không liên lạc được với ứng dụng. Hãy đóng rồi mở lại ứng dụng." Vi phạm hợp đồng: câu chung của layer.
- **Bấm "Chọn tệp sao lưu":**
  1. Gọi `open_file`. Mọi nút bị vô hiệu tới khi hộp thoại đóng; bấm liên tiếp chỉ mở một hộp thoại.
     - `canceled: true`: dừng, trang giữ nguyên.
     - Promise bị từ chối: "Không mở được hộp thoại chọn tệp. Hãy thử lại."
     - Vi phạm hợp đồng: câu chung của layer.
  2. Có `path`: **chưa gửi gì.** Hiện khung xác nhận trong trang (`ConfirmPanel`, §7.2 nguyên tắc 5: thay toàn bộ dữ liệu là thao tác khó quay lại), gồm:
     - "Khôi phục từ tệp: `<path>`";
     - "Khi bạn đóng rồi mở lại ứng dụng, toàn bộ dữ liệu hiện tại sẽ được thay bằng dữ liệu trong tệp này. Trước đó, ứng dụng tạo một bản sao lưu an toàn của dữ liệu hiện tại. Dữ liệu bạn nhập sau bước này sẽ không có trong dữ liệu sau khôi phục.";
     - nếu đang có lần khôi phục chờ: thêm câu "Lần khôi phục đang chờ sẽ được thay bằng lần này.";
     - nút **"Chuẩn bị khôi phục"** và **"Quay lại"**. Focus tới "Chuẩn bị khôi phục". Khi khung mở, hai nút của hàng nút bị vô hiệu.
     - "Quay lại": đóng khung, không gửi gì.
  3. Bấm "Chuẩn bị khôi phục": mọi nút bị vô hiệu; trạng thái "Đang chuẩn bị khôi phục…"; gọi `restore:prepare` với `archive_path = path`.
     - 200: thông báo "Đã chuẩn bị khôi phục. Hãy đóng rồi mở lại ứng dụng để hoàn tất." Khung "Đang chờ khôi phục" dựng từ chính bản ghi trả về (không cần đọc lại).
     - 400: "Không dùng được tệp này. Hãy chọn tệp khác."
     - 404: "Không tìm thấy tệp này. Có thể tệp đã bị chuyển hoặc xóa. Hãy chọn lại."
     - 409: "Tệp này không dùng được để khôi phục: có thể không phải bản sao lưu của Commission Tracker, đã bị hỏng, hoặc được tạo bởi phiên bản mới hơn của ứng dụng."
     - 424: "Không tạo được bản sao lưu an toàn của dữ liệu hiện tại, nên chưa chuẩn bị khôi phục. Hãy kiểm tra ổ đĩa còn chỗ trống rồi thử lại."
     - 500: "Không ghi được thông tin khôi phục, nên chưa chuẩn bị khôi phục. Hãy thử lại."
     - 503: "Ứng dụng chưa đọc được tệp sao lưu vì phần xử lý dữ liệu không phản hồi. Hãy đóng rồi mở lại ứng dụng, rồi thử lại."
     - Promise bị từ chối: "Không liên lạc được với ứng dụng. Hãy đóng rồi mở lại ứng dụng." Vi phạm hợp đồng: câu chung của layer.
     - Mọi kết quả không phải 200: đọc lại `restore:status` (luật trình bày ở trên).
- **Bấm "Hủy lần khôi phục đang chờ":** **không** hỏi xác nhận. Hủy không đổi dữ liệu nào, và chuẩn bị lại được bất cứ lúc nào, nên không thuộc §7.2 nguyên tắc 5. Mọi nút bị vô hiệu; gọi `restore:cancel`.
  - 200 `canceled: true`: "Đã hủy lần khôi phục đang chờ. Dữ liệu hiện tại giữ nguyên." Ẩn khung.
  - 200 `canceled: false`: "Không còn lần khôi phục nào đang chờ." Ẩn khung.
  - 500: "Không hủy được lần khôi phục đang chờ. Hãy thử lại." Rồi đọc lại `restore:status`.
  - Promise bị từ chối, vi phạm hợp đồng: như ở trên, rồi đọc lại `restore:status`.
- **Không nhớ gì** giữa các lần mở trang ngoài những gì `restore:status` trả. Không dùng `localStorage` hay nơi lưu nào khác.
- **Không có hạn chờ riêng.** `ipc_bridge` không có hạn chờ (chặng E); `restore:prepare` chờ backend tối đa theo Configs của Desktop. Trong lúc chờ, trang hiện "Đang chuẩn bị khôi phục…".
- **Giới hạn đã biết của V1:**
  - Bản sao lưu an toàn tích lũy theo mỗi lần chuẩn bị, và tệp dữ liệu cũ tích lũy trong `restore-previous` theo mỗi lần áp dụng; trang không nhắc tới và không dọn (DSK-24, V2).
  - Hộp thoại kết quả sau khi mở lại là của Desktop. Khi họa sĩ mở ứng dụng bằng lối tắt, nó lên trên cùng và có tiêu điểm (đo 2026-10-09, DSK-25 đóng); khi mở từ một tiến trình khác (công cụ kiểm thử) thì không.

### Điều hướng của chặng F

- `restore` không có tham số.
- Vùng điều hướng có bảy mục: "Khách hàng", "Đơn hàng", "Tiến độ", "Thu nhập", "Nhắc việc", "Sao lưu", "Khôi phục". Sáu mục cũ giữ nguyên vị trí.

### Luật phủ của kịch bản bấm thử ở chặng F (iWCA I6.3)

- **Hộp thoại chọn tệp trong kịch bản chạy tự động:** công cụ kiểm thử thay `dialog.showOpenDialog` của tiến trình chính qua `electronApp.evaluate`, như chặng E. `dialog:open-file` cũng dùng `showOpenDialog`, nên hàm thay thế của chặng E dùng lại được; phiên đo xác nhận trước khi dùng. Tệp sao lưu dùng trong kịch bản nằm trong thư mục tạm của lần chạy.
- **Mở lại ứng dụng:** kịch bản đóng ứng dụng rồi mở lại **trên cùng thư mục dữ liệu tạm**, với cờ `--ct-test-no-dialog` như mọi lần chạy tự động. Desktop khi đó ghi dòng `restore dialog text: …` thay vì hiện hộp thoại; công cụ kiểm thử đọc dòng đó.
- **Hộp thoại trong lần Project Owner chạy tay:** hộp thoại thật, cả hộp thoại chọn tệp lẫn hộp thoại kết quả sau khi mở lại.
- **Dữ liệu cho bước khôi phục thật:** công cụ kiểm thử tạo dữ liệu qua `http` (ví dụ khách A, B), tạo tệp sao lưu bằng `POST /backups` vào thư mục tạm của lần chạy, rồi đổi dữ liệu (thêm khách C). Sau khi mở lại, công cụ khẳng định `GET /clients` chỉ còn A, B. Giao diện không gọi các lời gọi này; chỉ công cụ kiểm thử gọi.
- `ok`:
  - mở trang từ mục "Khôi phục": "Không có lần khôi phục nào đang chờ";
  - chọn tệp, thấy khung xác nhận, bấm "Quay lại": không gửi gì, trang giữ nguyên;
  - chọn tệp, xác nhận: thông báo và khung "Đang chờ khôi phục" đúng; tệp bản sao lưu an toàn có thật;
  - hủy lần đang chờ: khung biến mất, thông báo đúng;
  - chuẩn bị lại, đóng ứng dụng, mở lại trên cùng thư mục dữ liệu: dòng `restore dialog text` có kết quả `restored` và đường dẫn tệp; dữ liệu là dữ liệu trong tệp sao lưu; trang "Khôi phục" hiện "Không có lần khôi phục nào đang chờ".
- `rejected_input`: không có, vì trang không có ô nhập. Ghi lý do trong `walkthrough.yaml`.
- `rejected_system`:
  - 409: hàm thay thế trả về một tệp `.ctbackup` không phải bản sao lưu (tệp văn bản trong thư mục tạm). Thấy đúng câu; không có gì đang chờ;
  - 404: hàm thay thế trả về một đường dẫn không tồn tại. Thấy đúng câu.

  Hai bước này chỉ có ở lần chạy tự động. 400, 424, 500, Promise bị từ chối và vi phạm hợp đồng được chứng minh bằng kiểm thử dựng trang.
- Ít nhất một bước `unreachable`: tắt backend bằng công cụ có sẵn, chọn tệp, xác nhận, thấy câu của 503 (`restore:prepare` không tới được backend); bật lại backend.
- **Ảnh bằng chứng có thời điểm và đường dẫn tạm** thay đổi theo lần chạy. Chấp nhận, như chặng E.

## 6. Đối chiếu độ phủ (Bước I1.6)

- Mọi lối vào ở §1, hoặc có workflow giao diện đối ứng ở §2, hoặc nằm trong bảng loại trừ ở §4. Không lối vào nào ở trạng thái "chưa rõ".
- Không có nhu cầu V1 nào mà thực đơn không đáp ứng được. Việc sắp xếp tên tiếng Việt là quyết định trình bày, không cần endpoint mới.
- D2 (2026-09-28): mọi lời gọi D2 cần đều có trong hợp đồng (bảng lời gọi ở phần D2). Nhu cầu không có lối vào: mở liên kết tham khảo bằng trình duyệt ngoài. Ghi nhận cho phiên bản sau, không vá ở V1.
- Giá trị khởi động đã trả lời đủ ba câu. Cách trao nằm trong hợp đồng và đã được đo.
- Chặng E (2026-10-07): mọi lời gọi trang `backup` cần đều có trong hợp đồng (`create_backup`, `native_dialogs.pick_folder`). `prepare_restore` vẫn nằm trong bảng loại trừ (§4); chỉ công cụ kiểm thử gọi nó.
- Chặng F (2026-10-09): mọi lời gọi trang `restore` cần đều có trong hợp đồng (`restore:status`, `restore:prepare`, `restore:cancel`, `native_dialogs.open_file`). Không có nhu cầu nào thiếu lối vào. Kết quả của pha 2 do Desktop hiện; giao diện không cần lối vào để đọc nó.

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

- 2026-10-09: `restore` → `hoàn_tất`. Audit phiên 37 đạt (`.reviews/audits/ui/audit_ui_session37.md`); Project Owner chạy tay kịch bản với hộp thoại thật (tiêu đề "Chọn tệp"; xác nhận, "Quay lại", câu "sẽ được thay", hủy không hỏi, 409 với tệp giả, 503 khi backend tắt, đóng rồi mở lại thì dữ liệu về đúng tệp sao lưu) và đo DSK-25 trên bản đóng gói mở bằng lối tắt. Chấp nhận các chỗ agent tự quyết: `--keep` và `--reopen` cho `walkthrough_app`; nút "Chọn tệp sao lưu" vẫn dùng được khi đọc trạng thái bị từ chối hay vi phạm hợp đồng; dòng chỉ báo "Đang hủy lần khôi phục đang chờ…"; `ConfirmPanel` xuống dòng giữa các câu và ngắt đường dẫn dài (CSS, không đổi màu). Phía giao diện của chặng F xong.

- 2026-10-09: làm lại I1 cho chặng F, căn cứ Data Schema 10.0.1 và API Contract 5.0.0: trang `restore` → `đang_làm` (plan phiên 37); mục điều hướng thứ bảy "Khôi phục"; workflow giao diện `restore_data` chỉ dùng `ipc_bridge`; kiểm hình dạng câu trả lời của bốn lời gọi, kể cả `code` khớp nhãn; xác nhận trong trang trước khi chuẩn bị, không xác nhận khi hủy; đọc lại trạng thái sau mọi lần chuẩn bị hay hủy không thành; luật phủ có bước đóng rồi mở lại trên cùng thư mục dữ liệu. Hợp đồng không đổi.

- 2026-10-08: `backup` → `hoàn_tất`. Project Owner chạy tay kịch bản với hộp thoại thật của Windows (S1, S2, S3, S5; S4 chỉ có ở lần chạy tự động): ba tệp `.ctbackup` được tạo, không trùng tên, không ghi đè; hủy không tạo tệp; backend tắt thì báo không kết nối được, bật lại thì tạo được. Log của Desktop khớp: bốn lần `chosen`, một lần `canceled`. Bước tùy chọn `C:\Windows` không chạy. Tiêu đề hộp thoại: Project Owner xác nhận ngày 2026-10-08 là "Chọn thư mục", kèm biểu tượng của ứng dụng (đóng điểm treo của audit phiên 33 §5.3). Chặng E xong.
- 2026-10-07: audit phiên 34 đạt về chức năng (`.reviews/audits/ui/audit_ui_session34.md`). Chấp nhận các chỗ agent tự quyết: hộp thoại hỏng hiện khung "Chưa tạo được bản sao lưu" với câu riêng (mã riêng của giao diện `DIALOG_FAILED`, không phải mã của hợp đồng); tiêu đề khung lỗi "Chưa tạo được bản sao lưu"; "Đang tạo bản sao lưu…" chỉ hiện ở bước 2, qua một hàm báo mà Routers nhận. `backup` giữ `đang_làm`, chờ Project Owner chạy tay.
- 2026-10-07: làm lại I1 cho chặng E, căn cứ Data Schema 9.0.3: trang `backup` → `đang_làm` (plan phiên 34); mục điều hướng thứ sáu "Sao lưu"; `scaffold_ui` thêm tài nguyên `ipc_bridge`; `invoke` thành giá trị khởi động bắt buộc (§3); luồng một nút (chọn thư mục rồi tạo bản sao lưu), không hỏi xác nhận; kiểm hình dạng câu trả lời `pick_folder`; luật phủ dùng hộp thoại thay thế cho lần chạy tự động, hộp thoại thật cho lần chạy tay; công cụ kiểm thử gọi `prepare_restore` để chứng minh tiêu chí chặng E. Hợp đồng không đổi.
- 2026-09-26: bản đầu. Đủ ba bảng cho toàn V1; chi tiết trang `client_list`.
- 2026-09-27: sau audit phiên 11 (B2a): màn hình lỗi khởi động không phải layout (sửa §5, không đổi hành vi).
- 2026-09-27: `client_list` → `đang_làm` (plan phiên 12).
- 2026-09-27: `client_list` → `hoàn_tất`: agent đề xuất theo I6, Orchestrator audit (`.reviews/audits/ui/audit_ui_session12.md`), Project Owner tự chạy S1–S3 trên Windows.
- 2026-09-28: thêm §7, hướng giao diện V1 (giao diện tối, token nền, nguyên tắc dễ chịu tối thiểu) theo `product_versions.md`; watermark ở §4 ghi là V4 trở đi.
- 2026-09-28: làm lại I1 cho D1: trang `client_detail`, `client_form`; `client_list` sửa (hành động thêm, bấm vào khách) → `đang_làm`; điều hướng có tham số và thông báo chuyển trang; vùng điều hướng trong `main_layout`; luật phủ của D1. Căn cứ hợp đồng không đổi (Data Schema 6.2.0 không đổi gì ở phía giao diện).
- 2026-09-28: sau audit phiên 16. `client_form` ghi rõ luật nào sao từ hợp đồng (Data Schema 7.0.0, CT-2: not blank) và luật nào `[UI-ONLY]`. Hàng nút của form nằm dưới tiêu đề, và focus chuyển tới ô lỗi đầu tiên. §7.1 thêm luật tương phản 3:1 cho thành phần tương tác. §7.2 bổ sung nguyên tắc 4 và 7. Ba trang giữ `đang_làm`, vá ở phiên 17.
- 2026-09-28: audit phiên 17 đạt (`.reviews/audits/ui/audit_ui_session17.md`). Ba trang D1 chờ Project Owner chạy tay ba kịch bản, rồi chuyển `hoàn_tất`.
- 2026-09-28: `client_list`, `client_detail`, `client_form` → `hoàn_tất`. Project Owner đã tự chạy tay ba kịch bản và xác nhận chức năng chạy đúng. Chặng D1 xong về phía giao diện.
- 2026-10-01: audit phiên 24 (`.reviews/audits/ui/audit_ui_session24.md`): D5 đúng đặc tả. Đính chính: luật thứ tự ngày của D5 nằm ngoài `type`, trái iWCA §5 (CT-5 chờ duyệt). Chấp nhận hai chỗ trình bày của agent. `income_report` giữ `đang_làm` chờ Project Owner chạy tay và quyết CT-5.
- 2026-10-01: CT-5 duyệt, phương án A (Data Schema 9.0.2): luật thứ tự ngày của D5 nằm trong `type`. Hành vi không đổi; Configs của `view_income_report` cập nhật ở phiên 25.
- 2026-10-03: `reminder_list`, `reminder_settings` → `hoàn_tất`: Project Owner chạy tay hai kịch bản D6, không có vấn đề. Chặng D6 xong về phía giao diện; D6 chỉ xong hẳn khi có `reminder_ticker` của desktop (DSK-17). UI-14 đóng: máy Project Owner đặt giờ kiểu 12 giờ, ô giờ gốc theo đúng cài đặt đó; V1 chấp nhận.
- 2026-10-03: audit phiên 27 đạt (`.reviews/audits/ui/audit_ui_session27.md`): D6 phía giao diện đúng đặc tả. Chấp nhận năm chỗ agent tự quyết, ghi vào mục D6: mặc định của "Thêm mốc nhắc"; mã và câu lỗi của mốc (≤ 0, quá 365 ngày, trùng hiện dưới ô số); câu cho mốc để trống; dòng chữ cố định đặt dưới hàng nút; với 500 khi "Đã xem", trang lặng lẽ đọc lại danh sách. Hai trang giữ `đang_làm`, chờ Project Owner chạy tay. Ghi nhận UI-13 (lỗi trùng mốc nhảy dòng sau khi bỏ một mốc) và UI-14 (ô giờ hiện kiểu 12 giờ có SA/CH trên Windows).
- 2026-10-03: làm lại I1 cho D6, căn cứ Data Schema 9.0.2: trang `reminder_list`, `reminder_settings` → `đang_làm` (plan phiên 27); mục điều hướng "Nhắc việc"; luật kiểm form cài đặt là bản sao của `reminder_settings_record`; "Đã xem" không hỏi xác nhận; giao diện không gọi `check_due`, kịch bản dùng công cụ kiểm thử để tạo nhắc việc. `reminder_ticker` (desktop) làm ở phiên sau. Hợp đồng không đổi.
- 2026-10-01: `income_report` → `hoàn_tất`: Project Owner chạy tay D5, không có vấn đề. Chặng D5 xong về phía giao diện. Lưu ý: sau khi DSK-15 đổi ngôn ngữ ứng dụng (phiên 26), ảnh bằng chứng có ô ngày trong `UI/evidence` sẽ cũ; phiên giao diện kế tiếp chạy lại kịch bản có runner để làm mới.
- 2026-10-01: audit phiên 25 đạt (`.reviews/audits/ui/audit_ui_session25.md`): Configs của `view_income_report` ghi Data Schema 9.0.2. Không trang nào đổi trạng thái; `income_report` vẫn chờ Project Owner chạy tay.
- 2026-09-30: làm lại I1 cho D5, căn cứ Data Schema 9.0.1: trang `income_report` → `đang_làm` (plan phiên 24); mục điều hướng "Thu nhập"; khoảng thời gian mặc định (đầu năm tới hôm nay); kiểm khoảng thời gian (ngày bắt đầu sau ngày kết thúc là bản sao của luật hợp đồng); cách trình bày ba con số, trong đó "Còn phải thu" không phụ thuộc khoảng thời gian; luật phủ D5. Hợp đồng không đổi.
- 2026-09-30: CT-4 được duyệt (Data Schema 9.0.0): luật phương thức not blank của D4 là bản sao của hợp đồng, không còn `[UI-ONLY]`. Hành vi không đổi.
- 2026-09-29: làm lại I1 cho D4: trang `payment_list`, `payment_form` → `đang_làm` (plan phiên 22); `commission_detail` thêm phần Thanh toán nên trở lại `đang_làm`; tên tiếng Việt của chiều tiền và loại khoản; cách ghép `paid_at`; xác nhận khi hủy khoản; luật phủ D4.
- 2026-09-29: `commission_list`, `commission_detail`, `commission_form`, `progress_board`, `stage_change` → `hoàn_tất`: audit phiên 21 đạt (`.reviews/audits/ui/audit_ui_session21.md`), Project Owner tự chạy tay các kịch bản D2 và D3, không có vấn đề. Chặng D2 và D3 xong về phía giao diện.
- 2026-09-29: audit phiên 20 (`.reviews/audits/ui/audit_ui_session20.md`): D3 đúng đặc tả; sửa câu khép lại ("Đơn đang ở giai đoạn …"); chốt `list_stages` rỗng là vi phạm hợp đồng. E2e không tất định (UI-10), nên năm trang D2 và D3 giữ `đang_làm`.
- 2026-09-29: làm lại I1 cho D3: trang `progress_board`, `stage_change` → `đang_làm` (plan phiên 20); `commission_detail` thêm phần Tiến độ; mục điều hướng "Tiến độ"; tên tiếng Việt của giai đoạn; xác nhận trong trang khi chuyển sang giai đoạn khép lại; luật phủ D3.
- 2026-09-29: audit phiên 19 (`.reviews/audits/ui/audit_ui_session19.md`): D2 đúng đặc tả, nhưng e2e không tất định (UI-9). Ba trang D2 giữ `đang_làm`. Ghi nhận: hai đơn lưu trong cùng một giây có thứ tự tùy ý (backend ghi `updated_at` tới giây).
- 2026-09-28: làm lại I1 cho D2, căn cứ Data Schema 8.0.1: ba trang `commission_list`, `commission_detail`, `commission_form` → `đang_làm` (plan phiên 19); mục điều hướng "Đơn hàng"; lời gọi, luật trình bày tiền và ngày, luật kiểm form (tiêu đề not blank theo CT-3; văn bản tùy chọn để trống gửi `null`), luật phủ của D2.
