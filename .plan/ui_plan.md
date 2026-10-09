# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-09T14:30:00+07:00
# contract: data_schema 10.0.1, api_contract 5.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 37 của dự án, phiên giao diện thứ mười sáu. **Chặng F, khôi phục, phần giao diện** (phiên 3 của chặng; pha 1 và pha 2 ở Desktop đã xong ở phiên 35 và 36):
- workflow giao diện `restore_data`. Workflow này chỉ dùng tài nguyên `ipc_bridge`, không dùng `http_client`;
- trang mới `restore`;
- mục điều hướng thứ bảy, "Khôi phục".

Đặc tả là `.design/ui_decomposition.md`, mục **"Chặng F — Khôi phục"** (làm lại I1 ngày 2026-10-09), cùng §1, §2, §4, §5 và §7. Câu chữ, luật kiểm hình dạng, luồng xác nhận và luật phủ đã chốt ở đó; plan này không chép lại. Bối cảnh hai pha: `.design/f_restore.md` (chỉ đọc; phần giao diện là pha 1).

Cuối phiên, `restore` được đề xuất `hoàn_tất`.

**Điểm dừng:**
- `npm run check` đạt;
- `npm run e2e` đạt **5 lần liên tiếp**, có đặt `CT_WALKTHROUGH_RUNNER`;
- spec mới chạy riêng đạt **10 lần liên tiếp**;
- `npm run dist` và `npm run test:packaged` của Desktop đạt (DSK-16: khung chính đổi);
- Project Owner chạy tay với hộp thoại thật, gồm cả một lần đóng rồi mở lại ứng dụng.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 2 và mục 5 (nhất là "Vận hành layer giao diện" và "Chạy ứng dụng thật");
   - skill `iwca-implementation` v1.0:
     - `iwca_theory.md`: §5, §6, §7 (ma trận R1–R14), §11;
     - `i3-logic.md`, `i4-kit.md`, `i5-screens.md`, `i6-self-check.md`;
   - `.design/ui_decomposition.md`:
     - §1: hàng `restore_data`, hàng `native_dialogs`;
     - §2: hàng `restore_data`, đoạn `native_dialogs`;
     - §4: dòng `prepare_restore`;
     - §5: vùng điều hướng, bảng trang;
     - mục **"Chặng F — Khôi phục"**;
     - mục **"Chặng E — Sao lưu"**: mẫu gần nhất (`ipc_bridge`, hộp thoại thay thế);
     - §7, nhất là §7.2 nguyên tắc 1, 4, 5 và 7;
   - `.design/f_restore.md`: §1, §2, §5 (chỉ để hiểu; không đổi gì ở Desktop);
   - `.plan/open_issues.md`:
     - UI-10 (luật `getByRole('status')`);
     - UI-11 và UI-18, đã đóng (cơ chế mở lại cửa sổ, cờ show-inactive, chế độ ghi bằng chứng);
     - DSK-16 (`test:packaged` khi khung chính đổi);
     - **DSK-25** (hộp thoại kết quả không tự lên trên cùng; phiên này giúp đo);
     - **DSK-27** (dòng log in sớm có thể mất khi máy tải; bài học cho công cụ kiểm thử của phiên này);
     - BE-8 (giờ trong checkpoint);
   - hợp đồng:
     - `data_schema.yaml`:
       - `clause_a_common`: `types.file_path`, `types.pending_restore_record`, `formats.timestamp`, luật renderer trong `mandatory_rules`, `shared_values.renderer_bridge`;
       - `clause_d_desktop.restore_data`, toàn mục;
     - `api_contract.yaml`: `endpoint_forms.ipc`, `error_codes`, `error_body`, `cross_cutting.native_dialogs.open_file`, `cross_cutting.restore_trigger`, `clause_d_desktop.restore_data`;
   - khối checkpoint của Desktop, **chỉ đọc**:
     - `Desktop/src/workflows/restore_data/services.ts`: EXP-001 tới EXP-009, hai NOTES;
     - `Desktop/src/cross_cutting/restore_trigger/restore_trigger.ts`;
     - `Desktop/src/cross_cutting/native_dialogs/native_dialogs.ts`: EXP-003, cách thay hộp thoại;
   - mọi khối checkpoint của `UI/`. Khối `backup_data` là mẫu gần nhất; khối `scaffold_ui` mô tả `ipc_bridge`;
   - plan này sau cùng.

   Xác nhận ba điều. Sai khác thì dừng lại và báo:
   - Data Schema **`10.0.1`** và API Contract **`5.0.0`**, cả hai `approved`, và `restore_data` ở `đã_hoàn_thiện`;
   - `Desktop/configs/restore_data.json` có ba địa chỉ `restore:prepare`, `restore:status`, `restore:cancel`;
   - `Desktop/configs/desktop.json` có `native_dialogs.open_file.address = "dialog:open-file"`.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm. Chạy `npm ci` trong `UI/`.
   - `npm run check`: mốc **1679**.
   - `npm run build` trong `Desktop/`, rồi `npm run e2e` có đặt `CT_WALKTHROUGH_RUNNER`: mốc **75**.
   - Chụp mốc `%APPDATA%\CommissionTracker`. Ghi `git status --short` (chỉ đọc).

2. **Đo trước khi viết.** Dùng script tạm ngoài dự án. Mở ứng dụng thật theo đúng cách của `walkthrough_harness.ts`, tức backend là fixture `switchable_backend.py`, với `--ct-test-no-dialog`.
   1. **Hộp thoại chọn tệp thay thế:**
      - cài hàm thay thế của `tests/tools/folder_dialog_stub.mjs`;
      - cho nó trả một đường dẫn tệp;
      - gọi `invoke('dialog:open-file', { filters: [...] })` từ trang.

      Ghi câu trả lời, và xác nhận không hộp thoại thật nào hiện. Ghi luôn câu trả lời của hai trường hợp hủy và ném lỗi.
   2. **Khứ hồi với fixture:**
      - tạo khách A, B qua `http`;
      - `POST /backups` vào một thư mục tạm;
      - thêm khách C;
      - `invoke('restore:prepare', { archive_path })`;
      - đóng ứng dụng sạch;
      - mở lại **trên cùng thư mục dữ liệu**.

      Ghi các điều sau:
      - fixture có dừng và khởi động lại được trên cùng cổng qua `backend_controller` của Desktop không. Ghi đủ các dòng `[switchable_backend]` và `backend_controller` trong log;
      - `GET /clients` sau khi mở lại;
      - có dòng `restore dialog text` không;
      - tệp điều khiển `down`/`up` của fixture có ảnh hưởng gì không.
   3. **Bộ gom log của harness có bắt được dòng in trước cửa sổ không** (DSK-27). Chạy bước 2 năm lần, đếm số lần dòng `restore dialog text` có trong log mà harness gom được.

   **Báo kết quả trước dòng code đầu tiên.** Nếu bước 2 không chạy được với fixture, dừng lại và báo. Không sửa Desktop. Nếu chỗ hỏng nằm ở fixture (`UI/tests/fixtures/`), nêu cách sửa trong báo cáo đầu phiên, rồi làm tiếp nếu không có gì khác chặn.

3. **Logic: workflow giao diện `restore_data`** (I3), đủ các thành phần.
   - **Configs:**
     - `contract.dataSchema: '10.0.1'`, `apiContract: '5.0.0'`;
     - bốn địa chỉ `ipc`, nhãn `[CONTRACT]`;
     - danh sách nhãn của từng lối vào, và cặp nhãn–mã lỗi (`400 ERR_VALIDATION` …), nhãn `[CONTRACT]`;
     - bộ lọc `open_file`, câu chữ, luật trình bày: `[UI-ONLY]`, đúng `ui_decomposition.md`.
   - **Adapters** nhận `ipc_bridge` (không nhận `http_client`):
     - `readStatus()`, `pickArchive()`, `prepare(archivePath)`, `cancel()`;
     - mỗi hàm kiểm hình dạng bằng Zod, theo đúng mục "Kiểm hình dạng câu trả lời" của đặc tả;
     - kết quả là một trong: thành công, một nhãn lỗi của hợp đồng, Promise bị từ chối, hay vi phạm hợp đồng.
   - **Services:**
     - luồng "chọn tệp, xác nhận, chuẩn bị";
     - hủy;
     - câu thông báo cho từng kết quả;
     - định dạng thời điểm;
     - luật "đọc lại trạng thái sau mọi lần chuẩn bị hay hủy không thành". Câu của lần hỏng giữ nguyên; lần đọc lại chỉ đổi khung.
   - **Routers:** lối vào cho bốn thao tác của trang: mở trang, chọn tệp, xác nhận chuẩn bị, hủy.
   - **Kiểm thử bắt buộc**, ngoài ma trận I3.6:
     - **hình dạng:**
       - mỗi lời gọi có một ca hợp lệ;
       - nhãn ngoài danh sách của lối vào đó, ví dụ `restore:status` trả 404;
       - `code` không khớp nhãn, ví dụ 409 với `ERR_STORAGE_IO`;
       - `error_body` thiếu trường;
       - `pending_restore_record` thiếu trường, có thời điểm sai dạng, hay đường dẫn rỗng;
       - `canceled` không phải boolean;
       - giá trị không phải đối tượng;
       - các luật `canceled`/`path` của `open_file`;
     - **luồng chọn tệp:**
       - hủy hộp thoại thì không gọi `prepare`;
       - Promise bị từ chối thì không gọi `prepare`;
       - chọn tệp thì **chưa** gọi `prepare` cho tới khi xác nhận;
       - "Quay lại" thì không gọi gì;
       - xác nhận thì gọi `prepare` đúng một lần, với đúng `archive_path`;
     - **đọc lại trạng thái:**
       - mỗi kết quả không phải 200 của `prepare` và `cancel` gọi `readStatus` đúng một lần;
       - 200 thì không gọi;
       - lần đọc lại hỏng thì khung ẩn và câu của lần hỏng đầu vẫn giữ;
     - **400 giữ bản ghi cũ:** `prepare` trả 400 và lần đọc lại trả một bản ghi. Khung hiện bản ghi đó.

4. **Kit** (I4).
   - Dùng lại component sẵn có: `ConfirmPanel`, khung kết quả của chặng E, và dòng thông báo. Cần component mới thì ghi lý do.
   - Đường dẫn dài xuống dòng được, như chặng E.
   - `check_contrast.mjs` phủ mọi component mới hoặc mở rộng. Mọi component export qua `kit/index.ts` (R9).

5. **Màn hình** (I5).
   - **Trang và hook `restore`,** theo mẫu `backup`:
     - hàng nút dưới tiêu đề, "Chọn tệp sao lưu" đứng đầu;
     - dòng chữ phụ;
     - khung "Đang chờ khôi phục";
     - khung xác nhận trong trang, focus tới "Chuẩn bị khôi phục";
     - trạng thái "Đang chuẩn bị khôi phục…";
     - nút bị vô hiệu đúng như đặc tả.
   - **Điều hướng:** thêm khóa `restore` (không tham số). Mục "Khôi phục" đứng sau "Sao lưu"; sáu mục cũ giữ nguyên vị trí.
   - **Ráp nối:** ráp `restore_data` ở Main và `logic_context`; Main trao `ipc_bridge` cho Adapters của nó.
   - **Kiểm thử dựng trang:**
     - mọi kết quả của bảng lời gọi ở đặc tả, cho cả bốn lời gọi: 400, 404, 409, 424, 500, 503 của `prepare`; 500 của `status` và `cancel`; Promise bị từ chối; vi phạm hợp đồng;
     - lần vẽ đầu: gọi `restore:status` đúng một lần; nút bị vô hiệu tới khi có kết quả;
     - có và không có lần đang chờ: nút "Hủy lần khôi phục đang chờ" hiện đúng lúc;
     - khung xác nhận: có câu "Lần khôi phục đang chờ sẽ được thay bằng lần này." khi đang có lần chờ, và không có khi không có;
     - "Quay lại" đóng khung, không gửi gì;
     - bấm liên tiếp chỉ mở một hộp thoại;
     - hủy không hỏi xác nhận;
     - vùng điều hướng có bảy mục đúng thứ tự.
   - Không đổi hành vi của các trang đã `hoàn_tất`; chỉ thêm mục điều hướng.
   - Sửa các spec và kiểm thử đang đếm đúng sáu mục điều hướng, như phiên 34 đã làm khi thêm "Sao lưu". Chỉ thêm mục "Khôi phục", không đổi gì khác.

6. **Kịch bản bấm thử và e2e** (I6.3).
   - **`walkthrough.yaml` mới cho `restore`,** theo luật phủ của chặng F.
   - **Hộp thoại thay thế:** dùng lại hàm của `folder_dialog_stub.mjs` theo kết quả đo ở việc 2.
     - Nếu cần đổi tên hay mở rộng hàm để nói rõ nó phục vụ cả chọn tệp, thì không được đổi hành vi với spec `backup` đang có.
     - Sửa comment "Only the dialog:pick-folder handler uses showOpenDialog" cho đúng: nay `dialog:open-file` cũng dùng.
   - **Mở lại ứng dụng trên cùng thư mục dữ liệu:**
     - thêm vào harness một cách đóng mà **giữ** thư mục dữ liệu, và một cách mở lại trên thư mục đó. Lần mở lại không đòi trang mở đầu rỗng, vì dữ liệu đã có;
     - thư mục vẫn được dọn sau ca, kể cả khi ca hỏng. Không thư mục tạm nào bị bỏ lại;
     - tệp điều khiển của fixture phải ở trạng thái `up` trước khi mở lại.
   - **Khẳng định của bước mở lại** dựa trước hết vào **dữ liệu và tệp**:
     - `GET /clients` chỉ còn A, B;
     - không còn `restore-pending.json`;
     - `restore-previous/` có một tệp;
     - trang "Khôi phục" hiện "Không có lần khôi phục nào đang chờ".

     Dòng `restore dialog text` chỉ là khẳng định phụ, và chỉ dùng nếu việc 2 bước 3 cho thấy harness bắt được nó 5/5. Bài học DSK-27: không để ca kiểm thử phụ thuộc vào một dòng log in sớm mà chưa chứng minh được là bắt được.
   - **Công cụ kiểm thử tạo dữ liệu và tệp sao lưu** qua `http` (`POST /clients`, `POST /backups` vào thư mục tạm của lần chạy), từ `UI/tests/`, **không** từ `UI/src/`.
   - **Lần Project Owner chạy tay:**
     - `npm run walkthrough:app` dùng hộp thoại thật.
     - Thêm vào `walkthrough_app.mjs` (chỉ công cụ kiểm thử) một cách mở lại ứng dụng trên **cùng** thư mục dữ liệu của lần trước, không tạo dữ liệu mẫu mới. Ví dụ `npm run walkthrough:app -- --reopen`, đọc thư mục từ tệp phiên.
     - Lần mở lại **không** truyền `--ct-test-no-dialog`, để hộp thoại kết quả thật hiện ra. Ghi rõ điều này trong comment và trong các bước bấm tay.
     - Viết **các bước bấm tay** cho kịch bản. Trong đó có:
       - ghi lại tiêu đề hộp thoại chọn tệp;
       - ghi lại chữ trên hộp thoại kết quả sau khi mở lại;
       - ghi lại hộp thoại kết quả có tự lên trên cùng không (DSK-25).
   - Tín hiệu "đã tải xong" là nội dung đã hiện. Khẳng định chữ trên `role="status"` phải lọc theo chữ (UI-10).
   - **Chạy:**
     - spec mới chạy riêng **10 lần liên tiếp**;
     - `npm run e2e` **5 lần liên tiếp**, từng lượt một, có `CT_WALKTHROUGH_RUNNER=coding-agent@<ngày>#<số>`;
     - một lần không đặt biến; sau lần đó `UI/evidence` giống hệt trạng thái sau các lượt có runner;
     - mọi lần hỏng đều tính, và đếm lại từ đầu;
     - Project Owner dùng máy bình thường trong lúc e2e chạy.

7. **DSK-16: bản đóng gói.** Khung chính có thêm mục điều hướng, nên chạy trong `Desktop/` (chỉ chạy, không sửa gì ở Desktop):
   - xóa `packaging\stage` và `release`;
   - nếu `npm run dist` hỏng EXDEV trong sandbox, đặt `ELECTRON_BUILDER_CACHE` vào một thư mục tạm;
   - `npm run dist`, rồi `npm run test:packaged`: mốc **11**, phải đạt cả 11.

   Hỏng ở chỗ phải sửa Desktop thì dừng lại và báo, không sửa. Nếu N14 hay D2 của `npm test` Desktop hỏng theo kiểu DSK-27, đó là việc của phiên 38; ghi lại, không sửa.

8. **Tự kiểm I6** cho `restore`, đủ năm góc. Đối chiếu bảy nguyên tắc §7.2, đặc biệt:
   - nguyên tắc 1: một hành động chính;
   - nguyên tắc 4: phản hồi sau thao tác;
   - nguyên tắc 5: xác nhận trước khi chuẩn bị, và lý do không xác nhận khi hủy;
   - nguyên tắc 7: vị trí nút chính.

   Ghi vào checkpoint `screens`.

9. **Checkpoint** (Giao thức 07; mọi khối `clause: external`):
   - khối mới `restore_data` (logic), kèm kết quả đo ở việc 2;
   - `main`: ráp nối mới, mốc kiểm thử;
   - `kit`: component mới hoặc mở rộng, nếu có;
   - `screens`: trang mới, mục điều hướng, tự kiểm I6, **đề xuất** trạng thái trang;
   - công cụ kiểm thử: ghi trong khối thích hợp (như phiên 34 đã ghi về `folder_dialog_stub`).

   **Giờ ghi trong checkpoint:** chép **nguyên** giá trị `Get-Date -Format o` lấy ngay trước khi ghi; không ước lượng, không làm tròn (BE-8). Nếu sửa lại một khối sau khi đã chạy toàn bộ, chạy lại phần kiểm thử bị ảnh hưởng và ghi rõ trong báo cáo (bài học audit phiên 36 §5.1).

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **DSK-16:** việc 7.
- **DSK-25:** Project Owner đo ở việc chạy tay (mục "Lần chạy tay của Project Owner" ở cuối plan). Agent chỉ ghi lại câu trả lời; không sửa Desktop.
- **DSK-26, DSK-27:** việc của phiên desktop 38. Không làm ở phiên này.
- **DSK-24** (V2): trang không nhắc tới và không dọn bản sao lưu an toàn hay `restore-previous`.
- **UI-6** (phần V2), **UI-7**, **UI-21:** không làm.
- **Giới hạn R13 đã khai:** chấp nhận ở V1.
- **Phép kiểm tĩnh `lint:e2e`** không bắt locator gán vào biến trước (Q21-1): đừng viết kiểu đó.
- **ENV-7** (`npm audit`): không chạy `npm audit fix`, không đổi phụ thuộc.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `endpoint_forms.ipc`:
  - renderer gọi `invoke(address, argument)` trên bridge;
  - đối số là một đối tượng có khóa là tên đầu vào;
  - câu trả lời là `{ status, body }`;
  - renderer không bao giờ chạm `ipcRenderer`.
- `request_restore`: `restore:prepare`, input `[archive_path]` (đối số `{ archive_path }`). Nhãn: 200 `restore_scheduled` (`pending_restore_record`), 400 `ERR_VALIDATION`, 404 `ERR_NOT_FOUND`, 409 `ERR_INCOMPATIBLE_BACKUP`, 424 `ERR_STORAGE_IO`, 500 `ERR_STORAGE_IO`, 503 `ERR_SERVICE_UNAVAILABLE`.
- `get_restore_status`: `restore:status`, input none (đối số `{}`). Nhãn: 200 `{ pending: pending_restore_record|null }`, 500 `ERR_STORAGE_IO`.
- `cancel_restore`: `restore:cancel`, input none (đối số `{}`). Nhãn: 200 `{ canceled: boolean }`, 500 `ERR_STORAGE_IO`.
- `pending_restore_record` = `{ archive_path: file_path, archive_app_version: string, archive_created_at: timestamp, safety_backup_path: file_path, prepared_at: timestamp }`.
- `native_dialogs.open_file`: `dialog:open-file`, input `{ filters: list[{ name, extensions }]|null }`, output 200 `{ canceled, path }`.
- `apply_pending_restore` là `in_process`, `called_by: [restore_trigger]`. Giao diện **không** gọi nó và không có cách nào gọi nó.
- `prepare_restore` và `create_backup` với `purpose: 'pre_restore'` **không** có trong `UI/src/`.
- `error_body.details` không có hình dạng trong hợp đồng: không đọc. `message` là tiếng Anh: không hiện.
- Bridge có đúng hai khóa `backendBaseUrl` và `invoke`; chỉ Main của UI đọc nó.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- ⚠ **Không có màn hình hồ sơ quyền sở hữu** (`/watermark-profiles`, `/watermark-strengths`).
- ⚠ **Không gọi `POST /backups/restore-preparations`, và không gọi `POST /backups` với `'pre_restore'`, từ mã trong `UI/src/`.** Chỉ công cụ kiểm thử trong `UI/tests/` được gọi `http` để dựng dữ liệu.
- Không gọi `dialog:save-file`. Không thêm lời gọi nào ngoài bốn lời gọi của bảng chặng F.
- Không sửa Desktop, không sửa Backend. Không sửa tệp nào ngoài `UI/`. Được **chạy** Desktop và Backend, kể cả `npm run dist` và `test:packaged`. Không thêm cờ `--ct-test-*`.
- ⚠ **Không kiểm thử nào đụng `%APPDATA%\CommissionTracker` thật.** Phiên này đóng rồi mở lại ứng dụng và Desktop đổi tên tệp dữ liệu, nên mọi lần mở, kể cả lần mở lại, đều kèm `--ct-test-data-dir` với thư mục tạm của lần chạy. Không kiểm thử nào ghi tệp sao lưu ra ngoài thư mục tạm.
- Không đổi hành vi của các trang `hoàn_tất`. Chỉ thêm mục "Khôi phục".
- Không dùng `window.confirm`, `alert` hay hộp thoại gốc nào ngoài `open_file` của Desktop. Không nhớ gì qua `localStorage` hay nơi lưu nào khác.
- Không nới thời gian chờ (của ca kiểm thử, của Playwright, hay hạn chờ 15 s của `http_client`). Không thêm `retries`, không đánh dấu `skip`, `fixme` hay `flaky`. Không gọi `focus()`, `moveTop()`, `restore()` trên cửa sổ ngoài cơ chế có sẵn của `window_guard`.
- Không làm các mục V2. Không gọt giao diện: không animation, không transition, không hiệu ứng trang trí, không giao diện sáng, không thư viện hay component từ nguồn ngoài.
- Không tắt luật, không thêm `eslint-disable`. Ngoại lệ lint mới phải liệt kê trong báo cáo, kèm lý do.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không tắt, không đổi cấu hình antivirus.
- Không nhân sub-agent. Không chạy song song hai lệnh e2e, hai lệnh `check`, hay hai bản ứng dụng.

## LẦN CHẠY TAY CỦA PROJECT OWNER (agent viết lệnh đầy đủ trong báo cáo)

1. **Kịch bản `restore` với hộp thoại thật** (`npm run walkthrough:app`, rồi `-- --reopen`):
   1. tạo bản sao lưu ở trang "Sao lưu";
   2. đổi dữ liệu, ví dụ thêm một khách;
   3. ở trang "Khôi phục", chọn tệp, bấm "Quay lại"; chọn lại, xác nhận;
   4. hủy, rồi chuẩn bị lại;
   5. đóng ứng dụng, mở lại trên cùng thư mục dữ liệu;
   6. đọc hộp thoại kết quả, kiểm khách vừa thêm đã không còn, và trang "Khôi phục" không còn lần chờ nào.
2. **Đo DSK-25 trên bản đóng gói mở bằng lối tắt,** sau việc 7. Đây là cách họa sĩ mở ứng dụng thật:
   1. tạo một lối tắt Windows tới `Desktop\release\win-unpacked\Commission Tracker.exe`, với tham số `--ct-test-data-dir=C:\ct-owner-f37`;
   2. mở bằng cách bấm đúp lối tắt;
   3. thêm một khách, sao lưu vào `C:\ct-owner-f37-backups`, thêm một khách nữa;
   4. chuẩn bị khôi phục từ tệp vừa tạo, đóng ứng dụng;
   5. bấm đúp lối tắt lần nữa;
   6. ghi lại: hộp thoại "Khôi phục dữ liệu" có tự hiện lên trên cùng, có tiêu điểm không; bấm "Đóng" xong thì cửa sổ ứng dụng có hiện không.

   Không dùng thư mục dữ liệu thật.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên Windows:

1. **Việc 2 đã đo:** báo cáo có câu trả lời của `open_file` với hộp thoại thay thế; kết quả khứ hồi với fixture; số lần harness bắt được dòng `restore dialog text` trên 5.
2. **Workflow `restore_data`:**
   - có đủ thành phần;
   - Configs ghi Data Schema 10.0.1 và API Contract 5.0.0;
   - chỉ dùng `ipc_bridge`;
   - đủ các ca kiểm thử bắt buộc của việc 3.
3. **Trang `restore`:**
   - chạy đúng đặc tả;
   - kiểm thử dựng trang phủ mọi kết quả;
   - các trang `hoàn_tất` không đổi hành vi;
   - không có lời gọi `prepare_restore`, `pre_restore` hay `dialog:save-file` nào trong `UI/src/`.
4. `npm run check` đạt, kể cả `lint:e2e`; số kiểm thử cao hơn mốc 1679.
5. **E2e:**
   - spec mới chạy riêng đạt 10/10;
   - `npm run e2e` đạt **5/5 lần liên tiếp**, số e2e cao hơn mốc 75;
   - một lần không đặt biến để `UI/evidence` nguyên vẹn;
   - bước `ok` của e2e chứng minh khứ hồi thật: sau khi mở lại, dữ liệu là dữ liệu trong tệp sao lưu.
6. Kịch bản bấm thử chạy trên hệ thống thật, có ảnh và đúng tên người chạy.
7. `npm run dist` từ trạng thái sạch và `npm run test:packaged` (11/11) đạt.
8. Tự kiểm I6 đủ năm góc.
9. **Checkpoint** theo Giao thức 07, giờ lấy bằng lệnh:
   - `restore_data` (mới), `main`, `screens`, cùng `kit` nếu có thay đổi;
   - không có `UNSOLVED_PROBLEMS`, trừ khi có ghi rõ.
10. Mốc `%APPDATA%` không đổi.
11. `git status --short` cuối phiên chỉ có tệp trong `UI/`. Liệt kê trong báo cáo, kèm `git check-ignore -v` cho mọi tệp và thư mục mới.
12. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
    - kết quả đo ở việc 2;
    - các lệnh để Project Owner tự chạy;
    - **các bước bấm tay** cho kịch bản `restore` và cho lần đo DSK-25 (mục "Lần chạy tay của Project Owner");
    - kết quả `test:packaged`;
    - đề xuất trạng thái trang;
    - danh sách ngoại lệ lint mới, nếu có.
