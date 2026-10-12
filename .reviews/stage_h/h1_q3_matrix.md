# Chặng H, bước 1: kiểm kê (phần 2, câu hỏi 3)

**Ngày:** 2026-10-12. **Người làm:** Orchestrator.
**Trạng thái mã:** commit `9b647f4`.
**Căn cứ:** `.plan/v1_roadmap.md`, chặng H, câu hỏi 3; API Contract `5.0.0`.

Phần này chỉ kiểm kê: đọc mã kiểm thử và đối chiếu với hợp đồng, chưa chạy lại các bộ kiểm thử. Phần chạy lại nhiều lượt nằm ở mục "Ổn định" của câu hỏi 3, đã chốt 3 lượt liên tiếp trên máy Project Owner.

**Cách làm.** Tôi dùng một script tạm để tìm, với mỗi ô, các ca kiểm thử vừa gọi đúng lối vào vừa khẳng định đúng nhãn. Ô nào script không thấy thì tôi tìm tay; mọi ô script bỏ sót đều tìm ra ca, do ca gọi qua hàm phụ hoặc qua bảng. Cột "một ca chỉ đích danh" ở phụ lục A do máy chọn, rồi tôi sửa tay năm ô chọn chưa đúng. Phiên kiểm độc lập của từng layer sẽ xác nhận lại bảng này.

## 1. Phạm vi của ma trận

- **Trong ma trận:** mọi lối vào V1 dùng. Gồm 25 lối vào `http` của backend (86 ô), 5 lối vào `in_process` của backend, 4 lối vào của `restore_data` (desktop), các lối vào của `native_dialogs`, và mọi lời gọi từ giao diện và desktop sang các lối vào đó.
- **Ngoài ma trận:**
  - `apply_watermark`, `verify_watermark`, `clause_c_ai_service`: `đang_chờ_triển_khai`, không có mã.
  - `manage_watermark_profile`: đang chạy, có kiểm thử backend đủ nhãn, nhưng V1 không ai gọi (UI-23 chặn bằng máy).

## 2. Kết quả

| Phần | Số ô | Có ca chỉ đích danh | Ghi chú |
|---|---|---|---|
| Backend, bên cung cấp `http` | 86 | 86 | phụ lục A |
| Backend, `in_process`: bên cung cấp | 5 lối vào | đủ 200, 404 | 500 phủ bằng ca khóa cơ sở dữ liệu |
| Backend, `in_process`: bên gọi | 8 cặp gọi | đủ | bên gọi dùng lời gọi `in_process` thật. Nhãn 500 của nguồn chỉ phủ bằng một ca chung mỗi workflow (khóa cả cơ sở dữ liệu), không có ca riêng cho từng nguồn. Đủ cho V1 |
| Giao diện, bên gọi | 31 lời gọi | đủ mọi nhãn, cộng "không tới được" và "vi phạm hợp đồng" | mỗi workflow có kiểm thử theo bảng (`describe.each(CASES)`). Một ca khác khẳng định bảng nhãn trong Configs trùng hợp đồng từng dòng. Script xác nhận cả 31 bảng nhãn đều khớp `api_contract.yaml` 5.0.0 |
| Desktop, bên cung cấp `ipc` (`restore_data`) | 11 ô | 11 | R2–R9, R13–R15 |
| Desktop, `apply_pending_restore` | 200, 500 | đủ | A1–A6; U1–U3 |
| Desktop, `native_dialogs` | `open_file`, `pick_folder` | đủ | N1–N13. Xem H-8 về `save_file` |
| Desktop, bên gọi `check_due` (`reminder_ticker`) | 200, 500, không tới được, vi phạm | đủ | D1, C1, B1 |
| Desktop, bên gọi `create_backup`, `prepare_restore` (`restore_data`) | 11 ô (nhãn, cộng không tới được và vi phạm) | 8 | thiếu ba ô, xem H-7 |

## 3. Chỗ thiếu

**H-7 (thấp, desktop).** Phía `restore_data` gọi sang backend còn ba ô chưa có ca chỉ đích danh:
- `create_backup` trả 400;
- `create_backup` trả thân sai hình dạng (vi phạm hợp đồng);
- `prepare_restore` trả 400.

Mã đã xử lý cả ba (`Desktop/src/workflows/restore_data/adapters.ts`): `create_backup` trả 400 hay thân sai hình dạng đều thành thất bại, Services trả 424; `prepare_restore` trả nhãn khác 200 và 404 thành thất bại, Services trả 503, như R13. Chỉ là chưa có ca. Việc: thêm ba chế độ vào `tests/fixtures/fake_backend_restore.py`, cùng ba ca kiểm thử.

**H-8 (trung bình, hợp đồng): `native_dialogs.save_file` được khai trong API Contract nhưng không tồn tại.** Desktop chưa hiện thực `dialog:save-file` (ghi rõ ở checkpoint `native_dialogs`, phiên 35); preload từ chối địa chỉ này, và ca N2 khẳng định điều đó. Hợp đồng mô tả hệ thống *là gì*, nên một lối vào được khai mà không có là một chỗ sai của hợp đồng, dù chưa ai gọi. Có hai hướng:
- **A (Orchestrator đề xuất):** bỏ `save_file` khỏi `clause_a_common.cross_cutting.native_dialogs.entries`. Đây là thay đổi phá vỡ theo `02-contract.md` (bỏ một lối vào đã khai), nên API Contract lên **6.0.0**. Không bên nào bị ảnh hưởng, vì không ai gọi. Khi có trang cần lưu tệp thì thêm lại.
- **B:** giữ nguyên, ghi vào changelog rằng lối vào này chưa hiện thực. Cách này nhẹ hơn, nhưng để hợp đồng nói sai về hệ thống.

Tôi chưa sửa hợp đồng; chờ Project Owner chọn (mã đề xuất CT-9).

## 4. Tình huống bất thường

| Tình huống | Hiện trạng | Kết luận |
|---|---|---|
| Backend chết giữa chừng | Desktop ca 6, 14 (`fake_backend_die_on_first_call.py`), DSK-28: một hộp thoại lỗi, ứng dụng thoát | đủ |
| Mở hai bản ứng dụng | Desktop ca 9; backend `test_database_ownership.py` (khóa BE-3) | đủ |
| Thư mục dữ liệu không ghi được | backend có ca 500 khi kết nối chỉ đọc. Chưa có ca nào khởi động **cả ứng dụng** khi thư mục dữ liệu không ghi được | **thiếu: H-9** |
| Ổ đầy | không dựng được ổn định trên máy thường. Đại diện bằng các ca `ERR_STORAGE_IO` (kết nối chỉ đọc, cơ sở dữ liệu bị khóa, ghi tệp hỏng giữa chừng ở `backup_data`), cùng một đường xử lý lỗi | đề xuất chấp nhận ở V1, kèm lý do này |
| Antivirus bật | mọi bộ kiểm thử chạy trên máy Project Owner với AVG và ReasonLabs bật | đủ; kiểm lại ở 3 lượt ổn định |
| Máy chậm, kiểm thử khi máy tải | DSK-30 mục 3, 6, 7; 3 lượt ổn định | làm ở phiên vá desktop |
| Đóng ứng dụng giữa lúc đang ghi | SQLite ghi theo giao dịch; `backup_data` ghi ra tệp tạm rồi mới đổi tên (có ca "hỏng giữa chừng không để lại tệp"). Chưa có ca giết tiến trình backend giữa lúc ghi rồi kiểm tính toàn vẹn | **thiếu: H-10** |
| Tắt máy giữa lúc khôi phục | đọc đặc tả `f_restore.md` §3: nếu dừng sau bước 4 (tệp cũ đã dời đi), lần mở sau backend tạo cơ sở dữ liệu rỗng, rồi `apply_pending_restore` vẫn thấy bản ghi đang chờ và tệp chờ, nên áp dụng lại và ra `restored`. Nếu dừng sau bước 5 (tệp chờ đã vào chỗ), lần mở sau tệp chờ không còn, nên ra `discarded`, và dữ liệu là dữ liệu của bản sao lưu, đúng ý họa sĩ. Tệp cũ vẫn ở `restore-previous` trong cả hai trường hợp. Suy luận là an toàn, nhưng **chưa có ca nào** dựng lại hai trạng thái sót lại này | **thiếu: H-11** |

**H-9 (trung bình, desktop).** Ca: khởi động ứng dụng khi thư mục dữ liệu không dùng được (`--ct-test-data-dir` trỏ vào một **tệp**, hoặc một thư mục không có quyền ghi). Khẳng định: hộp thoại lỗi tiếng Việt, mã thoát khác 0, không treo, không sót tiến trình python.

**H-10 (thấp, backend).** Ca: một luồng ghi liên tục qua `http`; giết tiến trình backend giữa chừng; khởi động lại. Khẳng định: `PRAGMA integrity_check` trả `ok`, mỗi bản ghi hoặc có đủ hoặc không có, và backend lên lại bình thường.

**H-11 (trung bình, desktop).** Hai ca dựng sẵn trạng thái sót lại rồi khởi động:
- sau bước 4: có bản ghi đang chờ, có tệp chờ, `db_file_path` trống. Khẳng định `restored`, đúng dữ liệu của bản sao lưu;
- sau bước 5: có bản ghi đang chờ, tệp chờ đã ở `db_file_path`. Khẳng định `discarded`, dữ liệu của bản sao lưu, tệp cũ vẫn ở `restore-previous`.

Nếu một trong hai ca cho kết quả khác suy luận ở trên, đó là lỗi thật của chặng F, phải xử lý trước khi gọi V1 là xong.

## 5. Đề xuất gộp việc vào phiên

Mỗi layer một phiên kiểm độc lập (câu hỏi 4), hai pha như đã chốt. Pha 2 nhận thêm các việc đã biết của layer đó, để không phải mở thêm phiên:

| Layer | Việc đã biết cho pha 2 |
|---|---|
| Backend | BE-8, BE-12 (Starlette), H-10 |
| Desktop | DSK-30 mục 3, 6, 7; H-7; H-9; H-11 |
| Giao diện | UI-21, UI-22, UI-23; H-6 (chạy lại phép cắn R1–R14) |

Thứ tự đề xuất: Backend → Desktop → Giao diện. Backend có ít việc nhất, và BE-12 có thể đổi gói của bản đóng gói, nên làm trước để Desktop dựng gói một lần.

## Phụ lục A. Backend, bên cung cấp `http`: 86 ô

| Workflow | Lối vào | Nhãn | Một ca chỉ đích danh |
|---|---|---|---|
| `manage_client` | `create_client` | 201 | `test_manage_client.py::test_concurrent_creates_through_shared_connection` |
| `manage_client` | `create_client` | 400 | `test_manage_client.py::test_create_rejects_malformed_input_with_400` |
| `manage_client` | `create_client` | 500 | `test_manage_client.py::test_writes_on_read_only_connection_answer_500` |
| `manage_client` | `list_clients` | 200 | `test_manage_client.py::test_list_is_short_form_sorted_by_name` |
| `manage_client` | `list_clients` | 500 | `test_manage_client.py::test_reads_on_locked_database_answer_500` |
| `manage_client` | `get_client` | 200 | `test_manage_client.py::test_get_client` |
| `manage_client` | `get_client` | 404 | `test_manage_client.py::test_get_unknown_and_malformed_id_are_404` |
| `manage_client` | `get_client` | 500 | `test_manage_client.py::test_reads_on_locked_database_answer_500` |
| `manage_client` | `edit_client` | 200 | `test_manage_client.py::test_edit_replaces_fields_keeps_created_at_and_archive_flag` |
| `manage_client` | `edit_client` | 400 | `test_manage_client.py::test_edit_errors` |
| `manage_client` | `edit_client` | 404 | `test_manage_client.py::test_edit_errors` |
| `manage_client` | `edit_client` | 500 | `test_manage_client.py::test_writes_on_read_only_connection_answer_500` |
| `manage_client` | `set_client_archived` | 200 | `test_manage_client.py::test_edit_replaces_fields_keeps_created_at_and_archive_flag` |
| `manage_client` | `set_client_archived` | 400 | `test_manage_client.py::test_archive_errors` |
| `manage_client` | `set_client_archived` | 404 | `test_manage_client.py::test_archive_errors` |
| `manage_client` | `set_client_archived` | 500 | `test_manage_client.py::test_writes_on_read_only_connection_answer_500` |
| `manage_commission` | `create_commission` | 201 | `test_backup_data.py::test_round_trip_a_second_backend_on_the_staging_file_serves_the_same_data` |
| `manage_commission` | `create_commission` | 400 | `test_manage_commission.py::test_create_rejects_malformed_input_with_400` |
| `manage_commission` | `create_commission` | 404 | `test_manage_commission.py::test_create_for_unknown_client_is_404` |
| `manage_commission` | `create_commission` | 409 | `test_manage_commission.py::test_create_for_archived_client_is_409` |
| `manage_commission` | `create_commission` | 500 | `test_manage_commission.py::test_writes_on_read_only_connection_answer_500` |
| `manage_commission` | `list_commissions` | 200 | `test_manage_commission.py::test_padded_title_is_accepted_and_stored_verbatim` |
| `manage_commission` | `list_commissions` | 500 | `test_manage_commission.py::test_locked_database_answers_500_everywhere_except_currencies` |
| `manage_commission` | `get_commission` | 200 | `test_manage_commission.py::test_get_commission` |
| `manage_commission` | `get_commission` | 404 | `test_manage_commission.py::test_get_unknown_and_malformed_id_are_404` |
| `manage_commission` | `get_commission` | 500 | `test_manage_commission.py::test_locked_database_answers_500_everywhere_except_currencies` |
| `manage_commission` | `edit_commission` | 200 | `test_manage_commission.py::test_edit_amount_keeps_created_at` |
| `manage_commission` | `edit_commission` | 400 | `test_manage_commission.py::test_edit_errors` |
| `manage_commission` | `edit_commission` | 404 | `test_manage_commission.py::test_edit_moving_to_unknown_or_archived_client` |
| `manage_commission` | `edit_commission` | 409 | `test_manage_commission.py::test_edit_currency_change_is_409` |
| `manage_commission` | `edit_commission` | 500 | `test_manage_commission.py::test_locked_database_answers_500_everywhere_except_currencies` |
| `manage_commission` | `list_currencies` | 200 | `test_manage_commission.py::test_list_currencies` |
| `update_progress` | `change_stage` | 200 | `test_backend_process.py::test_process_progress_stages_history_board_restart_and_storage_failure` |
| `update_progress` | `change_stage` | 400 | `test_update_progress.py::test_malformed_stage_change_is_400` |
| `update_progress` | `change_stage` | 404 | `test_backend_process.py::test_process_progress_stages_history_board_restart_and_storage_failure` |
| `update_progress` | `change_stage` | 409 | `test_backend_process.py::test_process_progress_stages_history_board_restart_and_storage_failure` |
| `update_progress` | `change_stage` | 500 | `test_backend_process.py::test_process_progress_stages_history_board_restart_and_storage_failure` |
| `update_progress` | `get_stage` | 200 | `test_update_progress.py::test_new_commission_counts_as_the_first_stage_and_writes_nothing` |
| `update_progress` | `get_stage` | 404 | `test_update_progress.py::test_unknown_commission_is_404_on_the_three_endpoints` |
| `update_progress` | `get_stage` | 500 | `test_update_progress.py::test_locked_database_answers_500_everywhere_but_list_stages` |
| `update_progress` | `get_stage_history` | 200 | `test_update_progress.py` (hàm phụ `history()`, dòng 86) |
| `update_progress` | `get_stage_history` | 404 | `test_update_progress.py::test_unknown_commission_is_404_on_the_three_endpoints` |
| `update_progress` | `get_stage_history` | 500 | `test_update_progress.py::test_locked_database_answers_500_everywhere_but_list_stages` (bảng, dòng 410) |
| `update_progress` | `get_board` | 200 | `test_update_progress.py::test_new_commission_counts_as_the_first_stage_and_writes_nothing` |
| `update_progress` | `get_board` | 500 | `test_update_progress.py::test_locked_database_answers_500_everywhere_but_list_stages` (bảng, dòng 411) |
| `update_progress` | `list_stages` | 200 | `test_update_progress.py::test_list_stages_is_the_catalog_in_order` |
| `record_payment` | `record` | 201 | `test_record_payment.py::test_concurrent_records_never_both_pass_the_range_check` |
| `record_payment` | `record` | 400 | `test_record_payment.py::test_record_rejects_malformed_input_with_400` |
| `record_payment` | `record` | 404 | `test_record_payment.py::test_record_unknown_commission_is_404` |
| `record_payment` | `record` | 409 | `test_record_payment.py::test_record_refuses_a_payment_that_puts_received_net_out_of_range` |
| `record_payment` | `record` | 422 | `test_record_payment.py::test_record_currency_mismatch_is_422` |
| `record_payment` | `record` | 500 | `test_record_payment.py::test_write_on_read_only_connection_answers_500_and_writes_nothing` |
| `record_payment` | `list_for_commission` | 200 | `test_record_payment.py::test_void_is_never_refused_and_get_balance_reports_out_of_range` |
| `record_payment` | `list_for_commission` | 404 | `test_record_payment.py::test_list_unknown_missing_and_malformed_id_are_404` |
| `record_payment` | `list_for_commission` | 500 | `test_record_payment.py::test_locked_database_answers_500_everywhere` |
| `record_payment` | `void_payment` | 200 | `test_record_payment.py::test_void_is_never_refused_and_get_balance_reports_out_of_range` |
| `record_payment` | `void_payment` | 404 | `test_record_payment.py::test_void_then_void_again_and_unknown` |
| `record_payment` | `void_payment` | 409 | `test_record_payment.py::test_void_is_never_refused_and_get_balance_reports_out_of_range` |
| `record_payment` | `void_payment` | 500 | `test_record_payment.py::test_write_on_read_only_connection_answers_500_and_writes_nothing` |
| `record_payment` | `get_balance` | 200 | `test_record_payment.py::test_void_is_never_refused_and_get_balance_reports_out_of_range` |
| `record_payment` | `get_balance` | 404 | `test_record_payment.py::test_balance_unknown_and_malformed_id_are_404` |
| `record_payment` | `get_balance` | 409 | `test_record_payment.py::test_void_is_never_refused_and_get_balance_reports_out_of_range` |
| `record_payment` | `get_balance` | 500 | `test_record_payment.py::test_locked_database_answers_500_everywhere` |
| `view_income_report` | `get_income_report` | 200 | `test_view_income_report.py::test_out_of_range_received_net_and_month_is_409` |
| `view_income_report` | `get_income_report` | 400 | `test_view_income_report.py::test_malformed_or_inverted_period_is_400` |
| `view_income_report` | `get_income_report` | 409 | `test_view_income_report.py::test_out_of_range_outstanding_is_409` |
| `view_income_report` | `get_income_report` | 500 | `test_view_income_report.py::test_locked_database_answers_500` |
| `backup_data` | `create_backup` | 201 | `test_backup_data.py::test_round_trip_a_second_backend_on_the_staging_file_serves_the_same_data` |
| `backup_data` | `create_backup` | 400 | `test_backup_data.py::test_invalid_backup_request_is_400_and_creates_no_file` |
| `backup_data` | `create_backup` | 500 | `test_backup_data.py::test_failure_while_writing_the_zip_is_500_and_leaves_no_file` (cùng 2 ca khác) |
| `backup_data` | `prepare_restore` | 200 | `test_backup_data.py::test_compatible_means_not_newer_by_semver_precedence` |
| `backup_data` | `prepare_restore` | 400 | `test_backup_data.py::test_prepare_with_a_malformed_body_is_400` |
| `backup_data` | `prepare_restore` | 404 | `test_backup_data.py::test_prepare_on_a_missing_path_or_a_folder_is_404` |
| `backup_data` | `prepare_restore` | 500 | `test_backup_data.py::test_prepare_on_an_unreadable_file_is_500` (cùng 1 ca khác) |
| `send_reminder` | `get_settings` | 200 | `test_send_reminder.py::test_defaults_before_any_save` |
| `send_reminder` | `get_settings` | 500 | `test_send_reminder.py::test_storage_failure_is_500_on_every_endpoint` |
| `send_reminder` | `edit_settings` | 200 | `test_send_reminder.py::test_storage_failure_is_500_on_every_endpoint` |
| `send_reminder` | `edit_settings` | 400 | `test_send_reminder.py::test_invalid_settings_are_400_and_nothing_is_saved` |
| `send_reminder` | `edit_settings` | 500 | `test_send_reminder.py::test_storage_failure_is_500_on_every_endpoint` |
| `send_reminder` | `check_due` | 200 | `test_send_reminder.py::test_storage_failure_is_500_on_every_endpoint` |
| `send_reminder` | `check_due` | 500 | `test_send_reminder.py::test_storage_failure_is_500_on_every_endpoint` |
| `send_reminder` | `list_pending` | 200 | `test_send_reminder.py::test_storage_failure_is_500_on_every_endpoint` |
| `send_reminder` | `list_pending` | 500 | `test_send_reminder.py::test_storage_failure_is_500_on_every_endpoint` |
| `send_reminder` | `acknowledge` | 200 | `test_send_reminder.py::test_pending_acknowledge_twice_and_not_found` |
| `send_reminder` | `acknowledge` | 404 | `test_send_reminder.py::test_pending_acknowledge_twice_and_not_found` |
| `send_reminder` | `acknowledge` | 500 | `test_send_reminder.py::test_storage_failure_is_500_on_every_endpoint` |
