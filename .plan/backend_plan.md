# ===WCA-PLAN===
# session_for: backend
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-11T20:30:00+07:00
# contract: data_schema 10.0.1, api_contract 5.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 41 của dự án, phiên backend thứ mười bốn, thuộc chặng G. Phiên ngắn, không thêm tính năng. Ba mã:

| Mã | Việc | Căn cứ |
|---|---|---|
| **BE-11** | Chứng minh cơ chế nâng cấp cấu trúc lưu trữ chạy đúng khi có một bước nâng cấp **thật sự áp lên dữ liệu đã có**. Hiện chưa từng có bước nào ngoài bước 1 | `.plan/open_issues.md` BE-11; thay cho tiêu chí 4 của DSK-21 ở bản 1.0 (Project Owner chọn hướng A, 2026-10-11) |
| **BE-9** | `wire_workflows` bắt buộc nhận `app_version`; bỏ nhánh "không ráp `backup_data`" | BE-9 (audit phiên 32 §5.4) |
| **BE-10** | Bỏ mọi chú thích tắt kiểm tra trong `Backend/` (`# noqa`, `# type: ignore`, `# pragma`) | BE-10 (Orchestrator phát hiện 2026-10-10) |

**Không đổi hành vi nào mà bên ngoài nhìn thấy.** Không điểm giao tiếp, nhãn, mã lỗi hay cấu trúc bảng nào đổi. Không thêm bước nâng cấp nào vào mã sản phẩm. Hợp đồng không đổi.

**Điểm dừng:**
- 564 kiểm thử cũ cộng các ca mới đều đạt, ba lượt liên tiếp;
- mỗi workflow có bảng có một kiểm thử nâng cấp đủ năm khẳng định của BE-11;
- `Backend/` không còn `noqa`, `type: ignore` hay `pragma`;
- Desktop `npm test` và UI e2e vẫn đạt với backend mới.

## ĐẶC TẢ ĐÃ CHỐT

### BE-11 — kiểm thử cơ chế nâng cấp cấu trúc lưu trữ

**Hiện trạng** (Orchestrator đọc ngày 2026-10-11):
- Sáu workflow có bảng: `manage_client`, `manage_commission`, `update_progress`, `record_payment`, `manage_watermark_profile`, `send_reminder`.
- Mỗi workflow có `_STORAGE_UPGRADES` ở cấp module trong `adapters.py`, hiện chỉ có bước 1, và `ensure_storage()` chạy các bước còn thiếu rồi ghi phiên bản, trong **một** `db.transaction()`.
- `scaffold_backend` mở kết nối với `isolation_level=None`, và `transaction()` tự `BEGIN IMMEDIATE` … `COMMIT` / `ROLLBACK`. Về lý thuyết, SQLite cho DDL nằm trong giao dịch, nên một bước hỏng giữa chừng phải được hoàn tác cả. **Chưa ai đo điều đó.**
- Kiểm thử hiện có chỉ phủ: tạo mới (phiên bản 0 lên 1), và "phiên bản mới hơn bản build biết thì dừng khởi động".

**Quyết định của Orchestrator: kiểm cả sáu workflow, không chọn một workflow đại diện.** Lý do: mỗi workflow tự viết `ensure_storage()` của mình, không dùng chung một hàm. Một workflow đúng không chứng minh năm workflow kia đúng. Mỗi kiểm thử ngắn và giống nhau.

**Mỗi workflow có một kiểm thử, nằm trong `workflows/<tên>/tests/`, làm như sau:**
1. Tạo cơ sở dữ liệu bằng **mã thật** ở phiên bản 1, rồi ghi ít nhất một bản ghi qua đúng điểm giao tiếp `http` của workflow đó (như các kiểm thử hiện có).
2. Dừng, rồi khởi động lại trên cùng tệp dữ liệu, với `_STORAGE_UPGRADES` của workflow đó được thay **chỉ trong kiểm thử** (ví dụ `monkeypatch.setattr`) bằng danh sách cũ cộng một **bước 2 giả**. Bước 2 chỉ chạm bảng của chính workflow đó, ví dụ thêm một cột mới vào một bảng của nó.
3. Khẳng định **năm** điều:
   - **(a) bước 2 đã chạy:** cột hay chỉ mục mới có trong bảng (đọc bằng `PRAGMA table_info` hay `sqlite_master` trên tệp dữ liệu, trong kiểm thử);
   - **(b) dữ liệu cũ còn nguyên:** đọc lại bản ghi ở bước 1 qua điểm giao tiếp `http`, kết quả giống hệt trước khi nâng cấp;
   - **(c) phiên bản ghi lên 2:** bảng `<tên>_schema_version` có đúng một dòng, giá trị 2;
   - **(d) khởi động lại lần nữa thì không chạy lại bước 2:** khởi động lần ba với cùng danh sách. Phải chạy được (nếu bước 2 là `ALTER TABLE … ADD COLUMN`, chạy lại sẽ báo trùng cột), và phiên bản vẫn là 2;
   - **(e) bước hỏng thì hoàn tác cả:** trên một tệp dữ liệu mới ở phiên bản 1, khởi động với bước 2 gồm **một câu lệnh đúng rồi một câu lệnh sai**. Việc khởi động phải thất bại; phiên bản vẫn là 1; tác dụng của câu lệnh đúng không còn; dữ liệu cũ còn nguyên.
4. Cách khởi động lại do agent chọn: gọi lại `wire_workflows` trên kết nối mới, hay khởi động tiến trình như các kiểm thử tiến trình hiện có. Ghi lý do.

**Nếu khẳng định (e) không đạt ở workflow nào:**
- dừng lại và báo Orchestrator, kèm điều đo được;
- **không** tự sửa `scaffold_backend` hay `ensure_storage()`.

Đó là một lỗi thật về an toàn dữ liệu, cần Orchestrator quyết cách sửa.

**Phép cắn** (chỉ trên bản sao tạm, khôi phục ngay):
- (a) trong `ensure_storage()` của một workflow, bỏ dòng `UPDATE … SET version`: khẳng định (c) và (d) phải hỏng;
- (b) đổi điều kiện `version > current` thành `version >= current`: khẳng định (d) phải hỏng;
- (c) cho từng bước chạy trong một `transaction()` riêng thay vì chung: khẳng định (e) phải hỏng.

Mỗi phép làm trên một workflow, ghi workflow nào.

### BE-9 — `app_version` bắt buộc

- `wire_workflows(app, db, configs, *, app_version, reminder_clock=None, backup_clock=None)`: `app_version` thành tham số từ khóa **bắt buộc, không có giá trị mặc định**.
- Mọi chỗ gọi trong kiểm thử truyền một giá trị đúng dạng `x.y.z`, ví dụ `"1.0.0"`, đặt ở một chỗ dùng chung của từng tệp kiểm thử. Orchestrator đếm được 22 chỗ gọi trong 10 tệp (kể cả `Backend.py` và `workflows/send_reminder/services.py`). Agent đếm lại cho đủ.
- Bỏ nhánh `if app_version is not None:` ở bước ráp `backup_data`: `backup_data` luôn được ráp.
- **`test_backup_is_not_wired_without_app_version`** (`workflows/backup_data/tests/test_backup_data.py`) không còn đúng ý. Thay bằng một ca khẳng định: gọi `wire_workflows` mà không có `app_version` thì báo `TypeError`, và không ráp workflow nào.
- `main()` đã truyền `app_version`. Không đổi gì ở `main()` ngoài khối checkpoint.

### BE-10 — chú thích tắt kiểm tra

**Hiện trạng** (Orchestrator rà ngày 2026-10-10):
- 7 dòng `# noqa: F401` trên `from .adapters import … StorageIOError` ở `services.py` của `record_payment`, `view_income_report`, `backup_data`, `manage_watermark_profile`, `send_reminder`, `manage_client`, `update_progress`;
- 2 dòng `# type: ignore[misc]` ở `compare_semver` của `workflows/backup_data/services.py`;
- 1 dòng `# pragma: no cover` ở `workflows/manage_client/tests/test_manage_client.py`.

`Backend/` **không cài linter, công cụ kiểm kiểu hay công cụ đo độ phủ nào** (`requirements-dev.txt` chỉ có `pytest`, `httpx`). Vì vậy các chú thích này hiện không tắt gì cả. Bỏ chúng để chặng H không phải giải thích từng dòng.

**Cách làm:**
- **`noqa: F401`:** mỗi dòng nhập lại `StorageIOError` để Routers chỉ phụ thuộc Services, như chú thích ngay trên dòng đó đã nói. Giữ việc nhập lại, bỏ `# noqa`, và khai báo tên được nhập lại trong `__all__` của `services.py`. `__all__` là cách chuẩn của Python để nói "tên này cố ý được xuất ra". Nếu một tên trong dòng đó **không** được dùng ở đâu cả, cả trong Services lẫn Routers, thì bỏ tên đó khỏi dòng nhập. Liệt kê trong báo cáo từng tên giữ hay bỏ.
- **`type: ignore[misc]`:** `parse_semver` trả `None` khi chuỗi không hợp lệ, nên kiểu trả về là `… | None`. Trong `compare_semver`, thay hai dòng bằng phép kiểm tường minh: nếu `parse_semver` trả `None` thì ném `ValueError` nêu chuỗi không hợp lệ. Hiện mọi chỗ gọi `compare_semver` đều đã kiểm chuỗi trước, nên hành vi với giá trị hợp lệ không đổi. Thêm một ca kiểm thử: chuỗi không hợp lệ thì có `ValueError`.
- **`pragma: no cover`:** bỏ chú thích, giữ nguyên mã.
- **Cuối phiên**, rà toàn bộ `Backend/` (trừ `env/`, `__pycache__/`): không còn `noqa`, `type: ignore`, `pragma`. Chỗ nào không bỏ được thì dừng lại và báo, không tự giữ.

**Không thêm linter hay công cụ kiểm kiểu** vào `requirements-dev.txt` trong phiên này. Việc đó, nếu cần, thuộc chặng H và phải được Project Owner duyệt (`CLAUDE.md` mục 5, công nghệ theo layer).

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`: mục 4, mục 5 (Backend, **phiên bản cấu trúc lưu trữ**, tệp `Backend.pyproj`), mục 6;
   - `04-implement.md` (năm lớp), `07-checkpoint-protocol.md`;
   - hợp đồng: `data_schema.yaml`, mục `clause_a_common.mandatory_rules` (luật mỗi workflow tự tạo và nâng cấp bảng của mình) và `backup_data` (`app_version`);
   - code:
     - `Backend/Backend.py`: khối checkpoint Main, `wire_workflows`, `main()`;
     - `Backend/workflows/scaffold_backend/adapters.py`: `SharedConnection`, `transaction()`;
     - `adapters.py` của sáu workflow có bảng (`_STORAGE_UPGRADES`, `ensure_storage`);
     - `services.py` của bảy workflow có dòng `noqa`; `workflows/backup_data/services.py` (`parse_semver`, `compare_semver`);
     - kiểm thử của các workflow và `Backend/tests/`;
   - `.plan/open_issues.md`: BE-9, BE-10, BE-11, BE-8;
   - plan này sau cùng.

   Xác nhận Data Schema **`10.0.1`** và API Contract **`5.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Python (`Backend\env\Scripts\python.exe --version`).
   - `cd Backend; env\Scripts\python.exe -m pytest -q`: mốc **564**. Khác thì dừng lại và báo.
   - Chụp mốc `%APPDATA%\CommissionTracker`.
   - Ghi `git status --short` (chỉ đọc).
   - Hỏi Project Owner hôm nay đã có phiên coding agent nào chạy chưa, để đếm `last_updated_by` cho đúng.

2. **BE-9** trước, vì nó đổi các chỗ gọi `wire_workflows` mà kiểm thử của BE-11 sẽ dùng. Chạy `pytest` toàn bộ: phải đạt.

3. **BE-11.** Viết sáu kiểm thử; làm ba phép cắn.

4. **BE-10.** Bỏ các chú thích; thêm ca `ValueError`; rà toàn bộ `Backend/`.

5. **`Backend.pyproj`:** nếu thêm tệp kiểm thử mới thì thêm mục `<Compile Include>` tương ứng (`CLAUDE.md` mục 5). Sửa bằng công cụ soạn thảo tệp trực tiếp, không bằng script.

6. **Chạy toàn bộ:**
   - `pytest` **3 lượt liên tiếp**; ghi số đạt mỗi lượt;
   - trong `Desktop/`: `npm test` một lượt (mốc **79**; trước đó chạy `node node_modules\electron\install.js` nếu `npm ci` làm mất tệp chạy Electron, ENV-10);
   - trong `UI/`: `npm run build` rồi `npm run e2e` một lượt (mốc **83**), không đặt `CT_WALKTHROUGH_RUNNER`; `UI/evidence` không đổi.

   Không cần `dist` hay `test:packaged` ở phiên này: bản đóng gói chính thức sẽ được dựng và kiểm lại ở chặng H.

7. **Checkpoint** theo Giao thức 07:
   - Main (`Backend.py`): EXPERIENCES cho BE-9; sửa các câu hiện trạng còn nói `app_version` là tùy chọn;
   - mỗi workflow có kiểm thử mới: EVIDENCE của kiểm thử nâng cấp;
   - `backup_data`: EXPERIENCES cho `compare_semver`;
   - khối có NOTES quá 14 ngày (`CLAUDE.md` mục 5): chuyển thành EXPERIENCES hoặc xóa, ghi trong báo cáo.

   **Giờ ghi:** chép **nguyên** giá trị `Get-Date -Format o` lấy ngay trước khi ghi (BE-8). **Nếu sửa checkpoint sau khi đã chạy toàn bộ, chạy lại `pytest` một lượt** và ghi điều đó trong báo cáo.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **DSK-30, ENV-10, UI-21, UI-22:** việc của layer khác; không làm.
- **ENV-7:** không chạy `npm audit fix`.
- Không đụng `apply_watermark`, `verify_watermark` (V4 trở đi).

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- Mỗi workflow backend chỉ tạo và nâng cấp **bảng của chính nó**, qua Adapters của nó, lúc khởi động. Không bảng nào tham chiếu bảng của workflow khác. Cơ sở dữ liệu khôi phục từ một `app_version` cũ hơn được nâng cấp bằng chính bước khởi động đó (`clause_a_common.mandatory_rules`).
- Gặp phiên bản cấu trúc mới hơn bản build biết thì dừng khởi động, không in `READY` (`CLAUDE.md` mục 5).
- `backup_data.app_version`: semantic version của bản đang chạy, do Main trao lúc khởi động.
- Không lối vào, nhãn, mã lỗi hay `status` nào đổi.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Không thêm bước nâng cấp nào vào `_STORAGE_UPGRADES` của mã sản phẩm. Bước 2 chỉ tồn tại trong kiểm thử.
- Không sửa `scaffold_backend`. Không đổi cách `ensure_storage()` chạy, trừ khi BE-11 (e) hỏng, và khi đó thì dừng lại báo, không tự sửa.
- Không đổi cấu trúc bảng, điểm giao tiếp, nhãn hay mã lỗi.
- Không thêm phụ thuộc mới vào `requirements.txt` hay `requirements-dev.txt`.
- Không sửa tệp nào ngoài `Backend/`. Được **chạy** các lệnh của `Desktop/` và `UI/`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus. Không sửa registry, không cài bộ cài.
- Không thêm `noqa`, `type: ignore`, `pragma` hay chú thích tắt kiểm tra nào khác. Không viết kiểm thử luôn đạt.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- ⚠ Không kiểm thử hay lần chạy nào được đụng `%APPDATA%\CommissionTracker` thật. Kiểm thử dùng thư mục tạm; Desktop luôn chạy kèm `--ct-test-data-dir`.
- Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên máy Project Owner, với antivirus đang bật:

1. **BE-11:**
   - sáu workflow có bảng, mỗi workflow một kiểm thử đủ năm khẳng định (a)–(e);
   - ba phép cắn bắt được, có ghi workflow;
   - không thêm bước nâng cấp nào vào mã sản phẩm.
2. **BE-9:** `app_version` bắt buộc; mọi chỗ gọi đã truyền; nhánh "không ráp" đã bỏ; ca `TypeError` thay cho ca cũ.
3. **BE-10:** `Backend/` (trừ `env/`, `__pycache__/`) không còn `noqa`, `type: ignore`, `pragma`; có `__all__` ở các `services.py` cần; có ca `ValueError` của `compare_semver`.
4. `pytest` đạt **3 lượt liên tiếp**: 564 cộng các ca mới.
5. Desktop `npm test` đạt 79/79 một lượt; UI e2e đạt 83/83 một lượt, `UI/evidence` không đổi.
6. **Checkpoint:** YAML hợp lệ; giờ ghi đúng BE-8; `UNSOLVED_PROBLEMS: []` ở mọi khối đã sửa.
7. Mốc `%APPDATA%` giống đầu phiên.
8. `git status --short` cuối phiên chỉ có tệp trong `Backend/`. Liệt kê trong báo cáo, kèm `git check-ignore -v` cho từng tệp mới (`core.ignorecase=true`).
9. **Báo cáo cuối phiên** theo `CLAUDE.md` mục 5, kèm:
   - với từng workflow của BE-11: bước 2 giả là gì, và kết quả năm khẳng định;
   - kết quả khẳng định (e) nói riêng (hoàn tác có chạy đúng không);
   - các phép cắn;
   - số chỗ gọi `wire_workflows` đã sửa;
   - bảng BE-10: từng dòng, đã làm gì;
   - số đạt của ba lượt `pytest`, của Desktop `npm test` và UI e2e;
   - các lệnh để chạy lại.
