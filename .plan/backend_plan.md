# ===WCA-PLAN===
# session_for: backend
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-07T09:40:00+07:00
# contract: data_schema 9.0.2, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 32 của dự án, phiên backend thứ mười ba, và là phiên đầu của **chặng E** (`.plan/v1_roadmap.md`). Một workflow mới, hai điểm giao tiếp:

| Workflow | Điểm giao tiếp | Địa chỉ | Bên gọi theo hợp đồng |
|---|---|---|---|
| `backup_data` (nghiệp vụ, Clause B) | `create_backup` | `POST /backups` | `external`, `restore_data` |
| | `prepare_restore` | `POST /backups/restore-preparations` | `restore_data` |

`backup_data` là **thao tác cấp kho lưu trữ** (`05-edge-cases.md`, Bước 5.6):
- chụp toàn bộ cơ sở dữ liệu thành một tệp sao lưu;
- kiểm một tệp sao lưu, rồi giải nén cơ sở dữ liệu trong đó ra một tệp chờ khôi phục (staging).

Nó xử lý cơ sở dữ liệu như một khối nguyên vẹn, **không bao giờ đọc hay diễn giải bảng của workflow nào**.

`restore_data` (Desktop) chưa tồn tại, và chặng F chưa quyết. `prepare_restore` vẫn làm ngay, vì phương án nào của chặng F cũng cần bước kiểm và chuẩn bị tệp sao lưu (roadmap, chặng E).

**Điểm dừng:**
- hai điểm giao tiếp đúng hợp đồng, có kiểm thử, có phép cắn;
- **460 kiểm thử cũ** cộng các ca mới đều đạt;
- Desktop, giao diện và bản đóng gói vẫn chạy đúng với backend mới;
- sao lưu và chuẩn bị khôi phục chạy được trên **bản đóng gói** (Python nhúng);
- checkpoint `backup_data` có EVIDENCE và NOTE đề xuất trạng thái.

Không có giao diện, không có Desktop ở phiên này.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`: mục 4 (bố cục workflow), mục 5 (Backend, phiên bản cấu trúc lưu trữ, tệp `Backend.pyproj`), mục 6;
   - `05-edge-cases.md`, **Bước 5.6** (thao tác cấp kho lưu trữ); `04-implement.md` (năm lớp, vị trí kiểm định dạng và kiểm nghiệp vụ); `07-checkpoint-protocol.md`;
   - `.design/03_classification.md`: `backup_data` và thứ tự ráp nối (Order 2);
   - hợp đồng:
     - `data_schema.yaml`: `backup_data` (toàn mục, nhất là `description`); `restore_data` (để hiểu bên tiêu thụ `restore_staging`); `types.backup_request_record`, `types.backup_archive_record`; `formats.file_path`, `formats.timestamp`; `clause_a_common.mandatory_rules` (biến môi trường lúc khởi động, có `CT_APP_VERSION`);
     - `api_contract.yaml`: `backup_data` (hai điểm giao tiếp và nhãn), `endpoint_forms.http`, `error_codes`, `error_body`;
   - code:
     - `Backend/Backend.py`: khối checkpoint Main, `read_launch_values` (đã đọc và kiểm `CT_APP_VERSION`), phần ráp nối các workflow;
     - `Backend/workflows/scaffold_backend/adapters.py`: `SharedConnection` (chỉ có `transaction()` và `read()`, cả hai mở giao dịch và giữ khóa của tiến trình);
     - một workflow mẫu đã audit đạt, ví dụ `Backend/workflows/send_reminder/` (năm lớp, `configs.yaml`, đồng hồ do Main tiêm vào, `_error_body`, kiểm thử qua HTTP);
     - `Backend/tests/test_cors.py`, `Backend/tests/test_backend_process.py`;
     - `Desktop/packaging/prepare_runtime.mjs`, chỉ đọc: xem `Backend/` được chép vào gói thế nào;
   - plan này sau cùng.

   Xác nhận Data Schema **`9.0.2`**, API Contract **`4.0.0`**, cả hai `approved`, và `backup_data` đang ở `đang_chờ_triển_khai`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Python (`Backend\env\Scripts\python.exe --version`).
   - `cd Backend; env\Scripts\python.exe -m pytest -q`: phải đạt **460/460**; khác thì dừng lại và báo.
   - Chụp mốc `%APPDATA%\CommissionTracker`: tên, kích thước, giờ ghi, SHA-256 của mọi tệp.
   - Ghi `git status --short` (chỉ đọc).

2. **Đo trước khi viết: chụp cơ sở dữ liệu qua `db_connection`.**
   - `SharedConnection` chỉ cho truy cập bên trong một giao dịch: `read()` mở `BEGIN DEFERRED` và giữ khóa của tiến trình. Phiên này **không được sửa** `scaffold_backend`.
   - **Orchestrator không nắm chắc** `sqlite3.Connection.backup()` của Python 3.13 có chạy được bên trong khối `read()` không, và có cho bản chụp nhất quán không (`VACUUM INTO` thì chắc chắn không chạy được trong giao dịch). Đo bằng một script nhỏ ngoài mã dự án:
     - `backup()` trong `read()` có lỗi không;
     - bản chụp mở được không, `PRAGMA integrity_check` ra `ok` không;
     - một luồng khác gọi `transaction()` trong lúc chụp thì chờ, và sau đó ghi được bình thường.
   - **Nếu không có cách nào chụp được qua `SharedConnection` hiện có:** dừng phiên ở đây và báo số đo. Không sửa `scaffold_backend`, không mở kết nối thứ hai tới tệp dữ liệu. Orchestrator sẽ đề xuất cách sửa.

3. **Định dạng tệp sao lưu** (chỉ `backup_data` biết định dạng, theo hợp đồng). Chốt như sau; muốn đổi điểm nào thì ghi lý do trong checkpoint.
   - Tệp zip (nén deflate), đuôi `.ctbackup`. Tên `commission-tracker-<purpose>-<YYYYMMDD-HHMMSS>.ctbackup` theo giờ máy. Trùng tên thì thêm hậu tố `-2`, `-3`…; **không bao giờ ghi đè** tệp có sẵn.
   - Đúng hai thành phần:
     - `manifest.json`: `{ format, format_version, app_version, created_at, purpose, db_size_bytes, db_sha256 }`;
     - `data.db`: bản chụp của việc 2.
   - Đuôi tệp, tiền tố tên, tên thành phần, `format` và `format_version` là giá trị nội bộ, đặt trong `workflows/backup_data/configs.yaml`.
   - `created_at` theo `formats.timestamp` (ISO 8601 có độ lệch giờ), lấy từ đồng hồ do Main tiêm vào, như `send_reminder`, để kiểm thử cố định được.

4. **`create_backup` (`POST /backups`).**
   - **Routers**, chỉ kiểm định dạng:
     - thân `{ backup_request: { destination_dir, purpose } }`;
     - `destination_dir` là đường dẫn tuyệt đối (`formats.file_path`);
     - `purpose` là `'manual'` hoặc `'pre_restore'`;
     - thừa trường hay sai kiểu: `400 ERR_VALIDATION`. FastAPI không bao giờ được tự trả `422`.
   - **Services:**
     - `destination_dir` không tồn tại hoặc không phải thư mục: `400 ERR_VALIDATION`, `details` chỉ rõ trường. Lý do: `create_backup` không có nhãn 404, và `ERR_VALIDATION` nghĩa là "outside its allowed values";
     - còn lại: chụp, đóng gói, ghi.
   - **Adapters, ghi nguyên tử:** ghi ra một tên tạm trong cùng thư mục đích, xong rồi mới đổi tên. Hỏng giữa chừng thì xóa tệp tạm, không để lại tệp sao lưu dở.
   - **Trả `201`** với `backup_archive_record`:
     - `archive_path` tuyệt đối;
     - `app_version` là giá trị đang chạy;
     - `size_bytes` và `sha256` (hex chữ thường) là của **tệp sao lưu**, không phải của `data.db`;
     - `created_at`.
   - Lỗi đọc hay ghi bất ngờ (quyền, đĩa đầy, tệp bị khóa): `500 ERR_STORAGE_IO`.
   - `purpose` chỉ ghi vào tên tệp và `manifest`; hai giá trị không khác nhau về hành vi.
   - Không tự xóa tệp sao lưu cũ. Không giữ danh sách các bản sao lưu: hợp đồng không có điều đó.

5. **`prepare_restore` (`POST /backups/restore-preparations`).**
   - **Routers:** thân `{ archive_path }`, đường dẫn tuyệt đối; sai định dạng: `400 ERR_VALIDATION`.
   - **Không tồn tại hoặc không phải tệp:** `404 ERR_NOT_FOUND`. Không đọc được vì lỗi hệ thống: `500 ERR_STORAGE_IO`.
   - **Mọi trường hợp còn lại trả `200`** với `restore_staging` đủ trường. API Contract ghi `is_valid` hay `is_compatible` có thể `false` mà vẫn `200`.
   - **Không hợp lệ** (`is_valid: false`, `is_compatible: false`, `staged_db_path: null`, `reason` nói vì sao):
     - không phải zip;
     - thành phần khác đúng hai tên đã chốt, hoặc tên thành phần có đường dẫn (chống zip slip);
     - `manifest` không đọc được, `format` hay `format_version` lạ;
     - `app_version` không phải phiên bản ngữ nghĩa;
     - `db_sha256` hoặc `db_size_bytes` không khớp;
     - `data.db` giải ra không mở được, hoặc `PRAGMA integrity_check` khác `ok`.

     Khi `manifest` còn đọc được thì vẫn điền `app_version` và `created_at`; không thì để `null`.
   - **Hợp lệ nhưng không tương thích:** `app_version` của tệp **mới hơn** bản đang chạy, theo thứ tự ưu tiên của SemVer 2.0 (bản có hậu tố tiền phát hành nhỏ hơn bản phát hành; bỏ qua phần build). Trả `is_valid: true, is_compatible: false, staged_db_path: null`, kèm `reason`.
   - **Hợp lệ và tương thích:** giải `data.db` ra tệp chờ, trả `staged_db_path`.
     - **Vị trí tệp chờ:** một thư mục con trong **thư mục chứa tệp dữ liệu đang chạy**, cùng ổ đĩa, để `restore_data` sau này đổi tên nguyên tử được. Lấy vị trí tệp dữ liệu qua chính `db_connection` (`PRAGMA database_list`), vì Bước 5.6 cho phép đi qua tài nguyên của workflow nền tảng. Không đọc `CT_DB_FILE_PATH` lần nữa, không đoán.
     - Tên thư mục con là giá trị nội bộ trong `configs.yaml`.
     - Mỗi lần chuẩn bị thay hẳn tệp chờ cũ: chỉ một tệp chờ tại một thời điểm, ghi tên tạm rồi đổi tên.
   - `prepare_restore` **không đụng** tệp dữ liệu đang chạy, và không giữ tệp sao lưu mở sau khi trả lời.
   - Kiểm hợp lệ chỉ ở mức khối tệp. Không đọc bảng nào bên trong `data.db` (Bước 5.6).

6. **Ráp nối trong Main (`Backend.py`).**
   - Đăng ký `backup_data` theo thứ tự của `.design/03_classification.md` (Order 2). Trao cho nó `db_connection`, `app_version` (giá trị Main đã đọc từ `CT_APP_VERSION`) và đồng hồ.
   - Main không chứa logic nào của sao lưu.
   - Cập nhật `Backend/Backend.pyproj` cho các tệp và thư mục mới, theo `CLAUDE.md` mục 5: sửa bằng công cụ soạn thảo tệp, không dùng script hay heredoc.
   - Kiểm thử `test_cors.py` về các phương thức được phép phải vẫn đạt; `POST` đã có.

7. **Kiểm thử**, trong `Backend/workflows/backup_data/tests/`, gọi qua HTTP như các workflow khác. Mọi tệp đều ở thư mục tạm; **không đụng `%APPDATA%` thật**.
   - **create_backup:**
     - tạo vài khách hàng và đơn hàng qua các điểm giao tiếp thật, rồi sao lưu: `201`, tệp tồn tại, `size_bytes` và `sha256` khớp tệp trên đĩa, tên đúng mẫu;
     - hai lần sao lưu trong cùng một giây: hai tệp khác tên, không ghi đè;
     - `purpose` là `pre_restore`: tên tệp và `manifest` đúng;
     - `destination_dir` tương đối, không tồn tại, là một tệp, `purpose` lạ, thừa trường: `400`, và không có tệp nào được tạo;
     - lỗi ghi giả lập (Adapters ném lỗi I/O): `500 ERR_STORAGE_IO`, không còn tệp tạm.
   - **prepare_restore:**
     - **khứ hồi:** sao lưu, chuẩn bị khôi phục; rồi chạy một backend thứ hai (tiến trình riêng, cổng khác) trên `staged_db_path`. `GET /clients` và `GET /commissions` của nó trả **đúng** dữ liệu đã tạo trước khi sao lưu;
     - không tồn tại: `404`; đường dẫn tương đối: `400`;
     - tệp không phải zip; zip thiếu `manifest`; zip có thành phần thừa; tên thành phần có `../`; `manifest` hỏng; `db_sha256` sai; `data.db` hỏng nhưng khớp checksum: mỗi trường hợp `200`, `is_valid: false`, có `reason`, không có tệp chờ;
     - tệp do bản mới hơn tạo (chạy backend với `CT_APP_VERSION=9.9.9` để sao lưu, rồi chuẩn bị trên backend `0.1.0`): `is_valid: true, is_compatible: false`;
     - bản cũ hơn và bản bằng nhau: tương thích. Thứ tự SemVer có ca tiền phát hành (`1.0.0-rc.1` < `1.0.0`);
     - chuẩn bị hai lần: chỉ còn một tệp chờ;
     - tệp dữ liệu đang chạy không đổi sau `prepare_restore` (SHA-256 trước và sau).
   - **Trong lúc sao lưu**, một yêu cầu ghi khác vẫn thành công sau đó, và bản sao lưu mở được.
   - **Phép cắn**, ghi số liệu rồi khôi phục:
     - (a) bỏ kiểm `db_sha256`: ca checksum sai phải hỏng;
     - (b) đảo phép so phiên bản: ca bản mới hơn phải hỏng;
     - (c) bỏ `integrity_check`: ca `data.db` hỏng phải hỏng.

     Nếu công cụ phân quyền chặn bước này thì không tìm cách vòng: khôi phục ngay, ghi lại, Orchestrator sẽ tự làm.

8. **Checkpoint của `backup_data`**, ở đầu `services.py` (Giao thức 07):
   - EXPERIENCES:
     - kết quả đo ở việc 2;
     - định dạng tệp sao lưu và lý do;
     - vị trí tệp chờ, và vì sao lấy qua `PRAGMA database_list`;
     - cách chia mã lỗi `400`, `404`, `500`;
     - các giới hạn đã biết (ví dụ: không kiểm nội dung nghiệp vụ trong `data.db`, đúng Bước 5.6).
   - EVIDENCE: lệnh, số ca, phép cắn, việc 10.
   - NOTE: đề xuất `backup_data` từ `đang_chờ_triển_khai` lên `đã_hoàn_thiện`. Không tự sửa hợp đồng.
   - Main (`Backend.py`): một EXPERIENCE về việc ráp nối.
   - **Giờ ghi:** chép **nguyên** giá trị của `Get-Date -Format o` lấy ngay trước khi ghi; không làm tròn (BE-8).

9. **Chạy toàn bộ trên Windows:**
   - `cd Backend; env\Scripts\python.exe -m pytest -q`: 460 cộng số ca mới, đều đạt, **3 lần liên tiếp**;
   - `cd Desktop; npm test`: đạt đủ (31);
   - `cd UI; npm run e2e`, **không** đặt `CT_WALKTHROUGH_RUNNER`: 70/70; sau đó `git status --short UI/evidence` trống.

10. **Bản đóng gói** (DSK-16: mã backend trong gói đã đổi).
    - `cd Desktop`; xóa `packaging\stage` và `release`; `npm run dist`; `npm run test:packaged` đạt (8).
    - **Đo tay trên bản đóng gói**, vì Python nhúng phải có đủ `zipfile`, `zlib`, `hashlib`:
      - chạy `release\win-unpacked\Commission Tracker.exe --ct-test-data-dir=<thư mục tạm> --ct-test-no-dialog`;
      - đọc cổng trong log; gọi `POST /backups` vào một thư mục tạm, rồi `POST /backups/restore-preparations` với tệp vừa tạo;
      - ghi hai câu trả lời vào EVIDENCE; đóng ứng dụng.
    - Không cài bộ cài.
    - Chụp lại mốc `%APPDATA%`: phải giống mốc ở việc 1.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `backup_data.description`, nguyên văn: *"Storage-level operation (05-edge-cases.md, Step 5.6): writes a consistent snapshot of the whole database to one archive file, and prepares an archive for restore by checking it and extracting its database into a staging file. Works on the database as a whole through db_connection; never reads or interprets any workflow's records. Only this workflow knows the archive format. An archive is compatible when its app_version is not newer than the running app_version."*
- `backup_request_record`: `{ destination_dir: file_path, purpose: 'manual' | 'pre_restore' }`.
- `backup_archive_record`: `{ archive_path, app_version, size_bytes, sha256, created_at }`.
- `restore_staging`: `{ archive_path, is_valid, is_compatible, app_version|null, created_at|null, reason|null, staged_db_path|null (set only when is_valid and is_compatible) }`.
- Nhãn:
  - `create_backup`: 201, 400 `ERR_VALIDATION`, 500 `ERR_STORAGE_IO`;
  - `prepare_restore`: 200, 400, 404 `ERR_NOT_FOUND`, 500.

  Không thêm nhãn. Không dùng `ERR_INCOMPATIBLE_BACKUP` ở đây: `prepare_restore` báo qua cờ trong `200`.
- `app_version` là `CT_APP_VERSION` mà Main đã đọc (Desktop truyền `app.getVersion()`). Không đọc nơi khác, không đặt mặc định.
- Một backend cho một tệp dữ liệu (Data Schema 6.2.0). Kiểm thử chạy backend thứ hai thì dùng **tệp khác**, tức tệp chờ, không dùng chung tệp dữ liệu.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Chỉ tạo và sửa trong `Backend/`: `workflows/backup_data/` (mới), phần ráp nối trong `Backend.py`, `Backend.pyproj`, và kiểm thử cấp layer nếu cần. **Không sửa `scaffold_backend`** hay workflow nào khác, kể cả kiểm thử của chúng. Không tạo `Backend/shared/`.
- Được **chạy** các lệnh của `Desktop/` và `UI/`, không sửa tệp nào ở đó. Không chạy UI e2e với `CT_WALKTHROUGH_RUNNER`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không đọc hay diễn giải bảng của workflow nào trong `backup_data`. Không mở kết nối thứ hai tới tệp dữ liệu đang chạy.
- Không thêm phụ thuộc vào `requirements.txt`; chỉ dùng thư viện chuẩn.
- Không kiểm thử hay lần chạy nào đụng `%APPDATA%\CommissionTracker` thật.
- Không tắt, không đổi cấu hình phần mềm diệt virus. Không cài bộ cài.
- Không tắt luật lint, không thêm `eslint-disable`; không `skip`, không `xfail`, không tăng thời gian chờ có sẵn.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không dùng sub-agent.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên máy Project Owner, với antivirus đang bật:

1. Kết quả đo ở việc 2, có ghi trong checkpoint. Nếu không chụp được thì phiên dừng ở đó, và đó cũng là một kết quả hợp lệ.
2. `create_backup` và `prepare_restore` đúng hợp đồng: đủ các ca ở việc 7, ca khứ hồi chạy trên backend thứ hai, ba phép cắn.
3. `pytest` 3 lần liên tiếp đạt (460 + ca mới); Desktop `npm test` đạt; UI e2e 70/70, `UI/evidence` không đổi.
4. `npm run dist` từ trạng thái sạch; `npm run test:packaged` đạt; sao lưu và chuẩn bị khôi phục chạy được trên bản đóng gói.
5. Mọi lần chụp mốc `%APPDATA%` giống nhau.
6. Checkpoint `backup_data` và Main: YAML hợp lệ, `UNSOLVED_PROBLEMS: []` hoặc ghi rõ việc còn lại; giờ đúng quy ước BE-8; NOTE đề xuất trạng thái.
7. `git status --short` cuối phiên chỉ có tệp trong `Backend/`. Liệt kê trong báo cáo.
8. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
   - kết quả đo ở việc 2;
   - bảng ca kiểm thử theo điểm giao tiếp;
   - ba phép cắn;
   - kết quả trên bản đóng gói;
   - các lệnh để chạy lại.
