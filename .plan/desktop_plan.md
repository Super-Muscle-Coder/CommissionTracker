# ===WCA-PLAN===
# session_for: desktop
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-08T09:30:00+07:00
# contract: data_schema 10.0.0, api_contract 5.0.0 (approved) — CT-7

## MỤC TIÊU PHIÊN NÀY

Phiên 35 của dự án, phiên desktop thứ bảy. Đây là phiên 1/3 của **chặng F, khôi phục theo hướng B**: "chuẩn bị, rồi mở lại để hoàn tất". Đặc tả ở `.design/f_restore.md`; hợp đồng là Data Schema 10.0.0 và API Contract 5.0.0 (CT-7).

Phiên này làm **pha 1**, tức chuẩn bị, cùng các việc đi kèm:

| Việc | Căn cứ |
|---|---|
| **Workflow `restore_data`**, workflow đầu tiên của layer desktop, đủ năm lớp ở `Desktop/src/workflows/restore_data/`, với ba lối vào `ipc`: `restore:prepare`, `restore:status`, `restore:cancel` | Data Schema `clause_d_desktop.restore_data`; API Contract `restore_data`; `f_restore.md` §2, §4, §5 |
| **`native_dialogs.open_file`** (`dialog:open-file`) | API Contract `cross_cutting.native_dialogs.open_file` |
| **DSK-22:** chuyển `native_dialogs-PROB-001` thành EXPERIENCE; thêm một ca giữ thứ tự đăng ký | `.plan/open_issues.md`, DSK-22 |

**Không làm pha 2** (`apply_pending_restore`, `backend_controller`, `restore_trigger`): đó là phiên 36. Sau phiên này, một bản ghi khôi phục đang chờ chỉ nằm đó, và lần mở sau **không** áp dụng nó. Không có trang giao diện ở phiên này.

**Điểm dừng:**
- từ trang thử, `invoke` gọi được ba lối vào `restore:*` và `dialog:open-file`, với câu trả lời đúng hợp đồng;
- một tệp sao lưu thật, do `create_backup` của backend tạo, chuẩn bị được. Sau khi chuẩn bị có bản sao lưu an toàn và bản ghi đang chờ, còn dữ liệu đang dùng thì **không đổi**;
- Desktop, bản đóng gói và e2e của giao diện vẫn đạt.

## ĐẶC TẢ ĐÃ CHỐT

`.design/f_restore.md` §2 (pha 1, từng bước, kèm quy tắc xóa bản ghi cũ ở bước 1), §4 (hình dạng) và §5 (lối vào) là đặc tả đã chốt. Plan này chỉ ghi những điểm triển khai mà đặc tả để mở.

### Bố cục và ráp nối

- **Workflow:** `Desktop/src/workflows/restore_data/`, gồm `entities.ts`, `adapters.ts`, `services.ts` (khối checkpoint ở đầu), `routers.ts`, và kiểm thử trong `tests/` của layer (Playwright). Không có tệp Configs trong `src/`.
- **Configs của workflow:** `Desktop/configs/restore_data.json` (`CLAUDE.md` mục 4). Chỉ Main đọc, rồi trao giá trị cho workflow. Gồm giá trị nội bộ: tên thư mục bản sao lưu an toàn (`safety-backups`), tên tệp bản ghi đang chờ (`restore-pending.json`), hạn chờ của mỗi lời gọi `http` tới backend.
  - Ba địa chỉ `ipc` là giá trị ranh giới. Nhãn kết quả của từng lối vào cũng vậy: ghi trong Configs, kèm chú thích trỏ về API Contract 5.0.0.
  - Tên thư mục `restore-previous` là của pha 2; không thêm ở phiên này.
- **Main** đọc `restore_data.json`, tạo Adapters, Services, Routers, rồi đăng ký ba trình xử lý `ipc`.
  - Đăng ký sau khi backend `READY` (workflow cần địa chỉ backend) và **trước khi tạo cửa sổ**, như `native_dialogs`.
  - Main trao `db_file_path` (đường dẫn Main đã tính, có tôn trọng `--ct-test-data-dir`) và `backend_base_url` (`environment_config`).
  - Danh sách địa chỉ mà preload chuyển thêm `restore:prepare`, `restore:status`, `restore:cancel` và `dialog:open-file`.
  - Main không quyết định gì của workflow; đó là Bước 4.9 của Main.
- **Phân lớp:**
  - Adapters chỉ làm một việc kỹ thuật mỗi hàm: gọi `prepare_restore`, gọi `create_backup` qua `http`, tạo thư mục, đọc, ghi nguyên tử và xóa tệp bản ghi.
  - Services quyết định trình tự và chọn nhãn (đúng §2).
  - Routers là ba trình xử lý `ipc`, mỗi trình xử lý:
    1. kiểm khung gửi theo cùng luật với `native_dialogs` (cửa sổ chính, origin bằng `ui_origin`);
    2. kiểm định dạng đối số;
    3. chuyển cho Services;
    4. trả `{ status, body }`.

  Muốn dùng chung hàm kiểm khung gửi với `native_dialogs` thì theo `05-edge-cases.md` Bước 5.3 và ghi lý do. Không thì để mỗi bên một bản: WCA chấp nhận trùng lặp.

### Ba lối vào

- **`restore:prepare`**, đối số `{ archive_path }`, đúng tên đầu vào:
  - đối số sai hình dạng, `archive_path` không phải chuỗi tuyệt đối, hay có khóa thừa: trả **400** `ERR_VALIDATION` dưới dạng một câu trả lời (`{ status: 400, body: error_body }`), không ném lỗi;
  - khung gửi bị từ chối: Promise bị từ chối, như `native_dialogs`;
  - các nhãn còn lại đúng `f_restore.md` §2 và §5;
  - `409` mang `details.reason` là `reason` của `restore_staging`.
- **`restore:status`**, đối số `{}` hoặc `undefined`:
  - trả `{ pending: <bản ghi> | null }`, trong đó bản ghi chỉ có năm trường của `pending_restore_record`, **không** có `staged_db_path`;
  - tệp bản ghi đọc không được (hỏng JSON, sai hình dạng): trả `500` `ERR_STORAGE_IO`. Việc dọn bản ghi hỏng là của pha 2.
- **`restore:cancel`**, đối số `{}` hoặc `undefined`:
  - xóa tệp bản ghi; trả `{ canceled: true }` nếu có tệp để xóa, `{ canceled: false }` nếu không;
  - không đụng tệp chờ (của `backup_data`) và bản sao lưu an toàn (giữ lại).
  - xóa hỏng: `500` `ERR_STORAGE_IO`.
- **Mọi lỗi lập trình** (ngoại lệ không lường trước) vẫn nổi lên thành lỗi thật, không bị giả làm 500.

### `native_dialogs.open_file`

- Đối số `{ filters }`. `filters` là `null` hoặc một danh sách `{ name: string, extensions: list[string] }` (hợp đồng). Chấp nhận thêm `{}` và `undefined`, nghĩa là không lọc, giống `pick_folder`. Sai hình dạng thì từ chối (Promise bị từ chối): hợp đồng không có nhãn 400 cho lối vào này.
- Gọi `dialog.showOpenDialog(<cửa sổ chính>, { properties: ['openFile'], title: <chữ trong config>, filters })`. Tiêu đề tiếng Việt, ví dụ "Chọn tệp", đặt trong `desktop.json` cạnh `pick_folder`.
- Trả `{ status: 200, body: { canceled, path } }`, cùng luật hủy, chọn và lỗi bất ngờ như `pick_folder`.
- Ca N2 hiện đang khẳng định `dialog:open-file` bị từ chối vì chưa hiện thực. Khẳng định đó không còn đúng: bỏ địa chỉ đó khỏi danh sách "địa chỉ lạ" của N2, giữ nguyên các địa chỉ khác. Sửa `native_dialogs-EXP-001` cho khớp. Đây là khẳng định cũ duy nhất được sửa ở `native_dialogs.spec.ts`, ngoài phần DSK-22.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`: mục 4 (bố cục `Desktop/`, có `configs/restore_data.json`), mục 5, mục 6;
   - `04-implement.md` (năm lớp, Bước 4.9 về Main); `05-edge-cases.md` (Bước 5.3, Bước 5.6: thao tác nguyên tệp); `07-checkpoint-protocol.md`;
   - **`.design/f_restore.md`, toàn bộ**; `.design/03_classification.md`;
   - hợp đồng:
     - `data_schema.yaml`: changelog v10.0.0; `clause_a_common` (`types.pending_restore_record`, `types.backup_request_record`, `types.backup_archive_record`, `types.file_path`, `formats.timestamp`); `clause_b_backend.backup_data`; `clause_d_desktop.restore_data`;
     - `api_contract.yaml`: changelog v5.0.0; `endpoint_forms`; `error_body`; `backup_data`; `restore_data`; `cross_cutting.native_dialogs`;
   - code:
     - `Desktop/src/main.ts`, khối checkpoint và phần khởi động;
     - `Desktop/src/preload.ts`;
     - `Desktop/src/cross_cutting/native_dialogs/` và khối checkpoint của nó (EXP-002, EXP-003, PROB-001);
     - `Desktop/configs/desktop.json`;
     - `Desktop/electron-builder.yml`;
     - `Desktop/tests/native_dialogs.spec.ts`, `tests/helpers.ts`, `tests/fixtures/probe/`, `tests/packaged/packaged_app.spec.ts`;
     - `Backend/workflows/backup_data/` (chỉ đọc): routers, configs, và EXP-003, EXP-004 của checkpoint, nói về tệp chờ và cách chia mã lỗi;
   - `.plan/open_issues.md`: **DSK-22**, DSK-16, BE-8; mục 5.1 về bộ phân loại quyền ở audit phiên 33, đã chép vào DSK-22;
   - plan này sau cùng.

   Xác nhận Data Schema **`10.0.0`** và API Contract **`5.0.0`**, cả hai `approved`. Xác nhận `restore_data` có ba lối vào `ipc` `restore:prepare`, `restore:status`, `restore:cancel`. Sai thì **dừng lại và báo**: plan này chỉ có hiệu lực sau CT-7.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm, Electron, Python; trạng thái AVG và ReasonLabs theo lời Project Owner.
   - Trong `Desktop/`: `npm ci`; `npm run lint`; `npm test`: mốc **40 đạt**.
   - Trong `UI/`: `npm run build`.
   - Chụp mốc `%APPDATA%\CommissionTracker` và `%APPDATA%\Commission Tracker`. Ghi `git status --short` (chỉ đọc).

2. **Đo trước khi viết** (không sửa mã dự án; script tạm ngoài dự án):
   - Chạy backend thật trên một thư mục dữ liệu tạm. Gọi `POST /backups` vào một thư mục tạm, rồi `POST /backups/restore-preparations` với tệp vừa tạo.
   - Ghi lại hai điều: đường dẫn tệp chờ; và việc gọi lần thứ hai với một tệp hỏng có xóa tệp chờ cũ không (`backup_data-EXP-003` nói có).
   - Ghi thêm thời gian của hai lời gọi, để chọn hạn chờ `http` trong `restore_data.json`.

3. **DSK-22**, làm trước để mọi lượt kiểm thử sau đã có ca mới.
   - Mục 1: `native_dialogs-PROB-001` thành EXPERIENCE (`derived_from: native_dialogs-PROB-001`). Ghi kết quả phép cắn (b) do Orchestrator chạy trên Linux, có ở DSK-22. `UNSOLVED_PROBLEMS: []`.
   - Mục 2: một ca trong đó trang gọi `invoke('dialog:pick-folder', {})` **ngay lúc nạp**, và khẳng định lời gọi đó có trả lời. Có thể là một trang thử riêng trong `tests/fixtures/`, hoặc một tham số của trang thử. Không đổi mã Main.
   - Phép cắn: dời `registerNativeDialogs` xuống sau lần nạp đầu thì ca này hỏng. Nếu bộ phân loại quyền chặn phép cắn, ghi lại rồi đi tiếp; không coi là hỏng tiêu chí, Orchestrator sẽ chạy trong audit (audit phiên 33 §5.1).

4. **`native_dialogs.open_file`** theo đặc tả, với kiểm thử theo mẫu N3 đến N6:
   - chọn và hủy;
   - `filters` hợp lệ được chuyển nguyên cho hàm hộp thoại giả;
   - `filters` sai hình dạng (không phải danh sách, phần tử thiếu `name`, `extensions` không phải danh sách chuỗi) bị từ chối và hộp thoại không mở;
   - cửa sổ cha là cửa sổ chính;
   - hộp thoại ném lỗi.

   Sửa N2 theo đặc tả. Thêm nút "Chọn tệp sao lưu" vào trang thử, gọi `open_file` với bộ lọc `.ctbackup`.

5. **Workflow `restore_data`, pha 1**, theo đặc tả, rồi ráp ở Main.

6. **Kiểm thử của `restore_data`**, ứng dụng thật với backend thật, `--ct-test-data-dir`, gọi qua `invoke` từ trang thử:
   - **chuẩn bị đạt:**
     - tạo vài khách hàng qua `http`, tạo tệp sao lưu bằng `POST /backups`, đổi dữ liệu (thêm một khách), rồi `restore:prepare`;
     - kết quả: 200 đúng hình dạng; tệp bản ghi tồn tại; bản sao lưu an toàn nằm trong `safety-backups` cạnh `data.db` và qua được `prepare_restore`;
     - `data.db` đang dùng **không đổi**: `GET /clients` vẫn có khách vừa thêm;
   - **status và cancel:**
     - `restore:status` trả đúng năm trường, không có `staged_db_path`;
     - `restore:cancel` trả `canceled: true`, rồi `restore:status` trả `pending: null`, rồi `restore:cancel` lần hai trả `canceled: false`;
   - **409:**
     - một tệp không phải bản sao lưu (ví dụ một tệp văn bản đổi đuôi `.ctbackup`): 409, không có bản ghi, không tạo bản sao lưu an toàn mới;
     - nếu dựng được trong kiểm thử, một tệp sao lưu có `app_version` mới hơn: 409;
   - **yêu cầu mới thay yêu cầu cũ:** chuẩn bị đạt, rồi chuẩn bị một tệp hỏng: 409 **và** không còn bản ghi đang chờ (`f_restore.md` §2, bước 1);
   - **404, 400:** tệp không tồn tại cho 404; `archive_path` tương đối, khóa thừa hay đối số không phải object cho 400;
   - **424:** bản sao lưu an toàn hỏng. Agent tìm cách dựng, ví dụ đặt sẵn một **tệp** tên `safety-backups` để thư mục không tạo được, hoặc để backend trả 500. Không có bản ghi;
   - **500 khi ghi bản ghi hỏng:** agent tìm cách dựng (ví dụ đặt sẵn một thư mục trùng tên tệp bản ghi). Không có bản ghi;
   - **503:** backend không tới được. Dùng backend giả có sẵn trong `tests/fixtures/` nếu hợp, hoặc dừng backend bằng cách sẵn có của kiểm thử. Agent ghi cách dựng;
   - **khung gửi:** lời gọi từ khung có origin khác, hoặc từ cửa sổ thứ hai, bị từ chối (mẫu N7, N8);
   - **địa chỉ:** `restore:start` (đã bỏ khỏi hợp đồng) bị preload từ chối "ipc address not implemented".
   - **Phép cắn**, ghi số liệu rồi khôi phục:
     - (a) bỏ bước xóa bản ghi cũ ở đầu `prepare`: ca "yêu cầu mới thay yêu cầu cũ" hỏng;
     - (b) Services không dừng khi `is_compatible` là `false`: ca 409 hỏng;
     - (c) `status` trả cả `staged_db_path`: ca status hỏng.

     Phép nào bị bộ phân loại quyền chặn thì ghi lại rồi đi tiếp, như việc 3.

7. **Bản đóng gói.** Đây là bài học của `main-EXP-027`: bản cài từng thiếu `dist/cross_cutting`.
   - `electron-builder.yml` phải đưa `dist/workflows/**/*.js` và `configs/restore_data.json` vào `app.asar`.
   - Thêm ca **P10** vào `tests/packaged/packaged_app.spec.ts`:
     - bản đóng gói mở được;
     - `restore:status` trả `{ status: 200, body: { pending: null } }`;
     - `dialog:open-file` trả lời đúng với hộp thoại thay thế;
     - đóng sạch.
   - Liệt kê nội dung `app.asar` bằng `@electron/asar` trong báo cáo, như phiên 33.

8. **Trang thử cho Project Owner** (`npm run probe`): nút "Chọn tệp sao lưu", rồi "Chuẩn bị khôi phục" (gọi `restore:prepare` với tệp vừa chọn), "Xem trạng thái", "Hủy khôi phục". Mỗi nút hiện câu trả lời. Project Owner chạy ở việc 10.

9. **Checkpoint** (Giao thức 07):
   - **khối mới `restore_data`** ở đầu `services.ts`. Gồm:
     - EXPERIENCES: kết quả đo ở việc 2, cách dựng các ca hỏng, vị trí các tệp, những gì để dành cho pha 2;
     - EVIDENCE;
     - `UNSOLVED_PROBLEMS`.
   - **`native_dialogs`:** DSK-22, `open_file`, sửa EXP-001.
   - **Main:** ráp `restore_data`, `restore_data.json`, danh sách địa chỉ `ipc` mới.
   - **Giờ ghi:** chép **nguyên** `Get-Date -Format o` lấy ngay trước khi ghi (BE-8).

10. **Chạy toàn bộ**, với AVG và ReasonLabs bật:
    - `Desktop`:
      - `npm run lint`;
      - `npm test` đạt đủ **3 lần liên tiếp**;
      - xóa `packaging\stage` và `release`, rồi `npm run dist`. Gặp `EXDEV` thì đặt `ELECTRON_BUILDER_CACHE` vào thư mục tạm;
      - `npm run test:packaged`: 9 ca cũ cộng P10.
    - `UI`: `npm run e2e`, không đặt `CT_WALKTHROUGH_RUNNER`, **1 lượt**, 75/75; `git status --short UI/evidence` trống.
    - **Project Owner**, trên trang thử với hộp thoại thật:
      1. tạo một tệp sao lưu (trang sao lưu của ứng dụng thật, hoặc gọi thẳng);
      2. chọn tệp đó ở "Chọn tệp sao lưu": kiểm tiêu đề hộp thoại và bộ lọc `.ctbackup`;
      3. "Chuẩn bị khôi phục": 200;
      4. "Xem trạng thái": có bản ghi;
      5. "Hủy khôi phục": `canceled: true`.

      Ghi câu trả lời vào EVIDENCE.
    - Chụp lại mốc `%APPDATA%`: phải giống mốc ở việc 1.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **DSK-22:** việc 3.
- **DSK-16:** preload và gói đổi, nên chạy `test:packaged` (việc 10).
- **DSK-9, DSK-11, DSK-20, DSK-21:** không làm. DSK-21 thuộc chặng G.
- **ENV-7** (`npm audit`): không chạy `npm audit fix`, không đổi phụ thuộc.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `restore_data` là workflow nghiệp vụ của `clause_d_desktop`, đủ năm lớp. Nó gọi `backup_data` qua `http` (`prepare_restore`, `create_backup` với `purpose: 'pre_restore'`) qua Adapters, mô tả dữ liệu nhận về bằng Entities của chính nó, và không import gì của Backend.
- Bước 5.6: chỉ thao tác nguyên tệp. Pha 1 **không** chạm tệp dữ liệu đang dùng và không chạm tệp chờ của `backup_data`.
- `restore_status.pending` chỉ có năm trường của `pending_restore_record`.
- Mọi nhãn không phải 200 của `restore:prepare`: không có gì đang chờ.
- `endpoint_forms.ipc`: đối số là một object có khóa là tên đầu vào; câu trả lời là `{ status, body }`, với `body` là output tham chiếu hoặc `error_body`.
- Bridge vẫn chỉ có hai khóa `backendBaseUrl` và `invoke`.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- **Không làm pha 2:** không dừng, không khởi động lại backend từ workflow; không đổi tên hay chuyển `data.db`; không có `backend_controller`, `apply_pending_restore` hay `restore_trigger`.
- Không làm `save_file`. Không thêm địa chỉ `ipc` nào ngoài bốn địa chỉ của phiên.
- Không sửa tệp nào ngoài `Desktop/`. Được **chạy** các lệnh của `Backend/` và `UI/`. Không chạy UI e2e với `CT_WALKTHROUGH_RUNNER`.
- Không bật `nodeIntegration`, không tắt `contextIsolation` hay `sandbox`, không đưa `ipcRenderer` cho renderer.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus. Không thêm ngoại lệ cho `powershell.exe`. Không sửa registry, không cài bộ cài.
- Không đổi chữ dòng log `FATAL:`, cách dừng hay thứ tự khởi động backend, hay hành vi của `reminder_ticker`.
- Không tăng thời gian chờ sẵn có. Không `retries`, không `skip`. Không tắt luật lint, không thêm `eslint-disable`, không viết kiểm thử luôn đạt.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không kiểm thử hay lần chạy nào đụng `%APPDATA%\CommissionTracker` thật. Mọi lần chạy ứng dụng đều kèm `--ct-test-data-dir`; bản sao lưu an toàn và bản ghi đang chờ của kiểm thử nằm trong thư mục tạm đó.
- Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử hay hai bản ứng dụng.
- ⚠ Ràng buộc V1: không màn hình hồ sơ quyền sở hữu. Phiên này không làm giao diện.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên máy Project Owner, với antivirus đang bật:

1. **Đo trước khi viết:** báo cáo có kết quả đo ở việc 2.
2. **DSK-22:** `native_dialogs-PROB-001` thành EXPERIENCE; có ca gọi lúc nạp, kèm phép cắn (hoặc ghi rõ bị chặn).
3. **`open_file`:** chạy đúng đặc tả, có kiểm thử; N2 sửa đúng một chỗ.
4. **`restore_data`, pha 1:**
   - đủ năm lớp, ba lối vào đúng nhãn của hợp đồng;
   - đủ các ca của việc 6, kèm ba phép cắn;
   - dữ liệu đang dùng không đổi sau khi chuẩn bị.
5. Project Owner chạy trang thử với hộp thoại thật (việc 10).
6. **Chạy toàn bộ:**
   - `npm run lint`;
   - `npm test` 3 lần liên tiếp đạt;
   - `npm run dist` từ trạng thái sạch;
   - `npm run test:packaged` có P10;
   - UI e2e 75/75, `UI/evidence` không đổi;
   - mốc `%APPDATA%` giống nhau.
7. **Checkpoint** `restore_data` (mới), `native_dialogs`, Main: YAML hợp lệ; giờ đúng BE-8.
8. `git status --short` cuối phiên chỉ có tệp trong `Desktop/`. Liệt kê trong báo cáo, **kèm `git check-ignore -v`** cho mọi tệp và thư mục mới (ENV-9).
9. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
   - kết quả đo;
   - bảng ca kiểm thử;
   - các phép cắn;
   - câu trả lời của Project Owner;
   - nội dung `app.asar`;
   - các lệnh để chạy lại;
   - danh sách ngoại lệ lint mới, nếu có.
