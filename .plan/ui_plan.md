# ===WCA-PLAN===
# session_for: ui
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-07T16:40:00+07:00
# contract: data_schema 9.0.3, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 34 của dự án, phiên giao diện thứ mười lăm. **Chặng E, sao lưu, phần giao diện** (phiên 3/3 của chặng):
- tài nguyên nền tảng mới `ipc_bridge` của `scaffold_ui`, dựng từ `invoke` của bridge. Đây là lời gọi `ipc` đầu tiên của giao diện;
- `invoke` thành giá trị khởi động bắt buộc của Main;
- workflow giao diện `backup_data`;
- trang mới `backup`;
- mục điều hướng thứ sáu, "Sao lưu".

Đặc tả là `.design/ui_decomposition.md`, mục **"Chặng E — Sao lưu"** (làm lại I1 ngày 2026-10-07), cùng §2, §3, §4, §5 và §7. Mọi câu chữ, luật kiểm hình dạng và luật phủ đã chốt ở đó. Plan này không chép lại.

⚠ **Giao diện không bao giờ gọi `POST /backups/restore-preparations` (`prepare_restore`).** Theo hợp đồng, chỉ `restore_data` gọi nó. Tiêu chí của chặng E ("tệp sao lưu tạo từ giao diện qua được `prepare_restore`") được chứng minh bằng **công cụ kiểm thử** trong `UI/tests/` gọi thẳng endpoint đó, như D6 đã làm với `check_due`.

Cuối phiên, `backup` được đề xuất `hoàn_tất`. Chặng E xong khi trang đó `hoàn_tất`.

**Điểm dừng:**
- `npm run check` đạt;
- `npm run e2e` đạt **5 lần liên tiếp**, có đặt `CT_WALKTHROUGH_RUNNER`;
- spec mới chạy riêng đạt **10 lần liên tiếp**;
- `npm run dist` và `npm run test:packaged` của Desktop đạt (DSK-16: khung chính đổi);
- Project Owner chạy tay với hộp thoại thật.

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`, mục 2 và mục 5 (nhất là "Vận hành layer giao diện" và "Chạy ứng dụng thật");
   - skill `iwca-implementation` v1.0:
     - `iwca_theory.md`: §5, §6, §7 (ma trận R1–R14), §11;
     - `i2-scaffold.md`: Bước I2.6, Main và giá trị khởi động;
     - `i3-logic.md`, `i4-kit.md`, `i5-screens.md`, `i6-self-check.md`;
   - `.design/ui_decomposition.md`:
     - §2: hàng `scaffold_ui`, hàng `backup_data`, đoạn `native_dialogs`;
     - §3: hàng `invoke` và đoạn ⚠ ngay dưới bảng;
     - §4: dòng `prepare_restore`;
     - §5: vùng điều hướng, bảng trang;
     - mục **"Chặng E — Sao lưu"**;
     - §7;
     - mục "Chặng D6" làm mẫu cho cách công cụ kiểm thử gọi một endpoint mà giao diện không gọi;
   - `.plan/open_issues.md`:
     - UI-10 (luật `getByRole('status')`);
     - UI-11 và UI-18, cả hai đã đóng: cơ chế mở lại cửa sổ, cờ show-inactive và chế độ ghi bằng chứng;
     - DSK-16: `test:packaged` khi khung chính đổi;
     - BE-8: giờ trong checkpoint;
   - hợp đồng:
     - `data_schema.yaml`:
       - `clause_a_common`: `types.file_path`, `types.backup_request_record`, `types.backup_archive_record`, `formats.timestamp`, luật số nguyên ±(2^53−1), luật renderer trong `mandatory_rules`, `shared_values.renderer_bridge`;
       - `backup_data`, toàn mục;
     - `api_contract.yaml`: `endpoint_forms.ipc` và `endpoint_forms.http`, `cross_cutting.native_dialogs`, `backup_data`, `error_body`;
   - khối checkpoint `native_dialogs` của Desktop (`Desktop/src/cross_cutting/native_dialogs/native_dialogs.ts`), nhất là EXP-002 (hành vi, các lần Promise bị từ chối), EXP-003 (cách thay hộp thoại bằng `app.evaluate`) và NOTES. Chỉ đọc;
   - mọi khối checkpoint của `UI/`. Khối `main` (`src/main.tsx`) và `scaffold_ui` (`src/logic/workflows/scaffold_ui/adapters.ts`) là chỗ phiên này sửa nền; khối `send_reminder` là khối trang gần nhất;
   - plan này sau cùng.

   Xác nhận Data Schema **`9.0.3`** và API Contract **`4.0.0`**, cả hai `approved`, và `backup_data` ở `đã_hoàn_thiện`. Xác nhận thêm `Desktop/configs/desktop.json` có `native_dialogs.pick_folder.address = "dialog:pick-folder"`. Sai khác thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm. Chạy `npm ci` trong `UI/`.
   - `npm run check`: mốc **1555**.
   - `npm run build` trong `Desktop/`, rồi `npm run e2e` có đặt `CT_WALKTHROUGH_RUNNER`: mốc **70**.
   - Chụp mốc `%APPDATA%\CommissionTracker`. Ghi `git status --short` (chỉ đọc).

2. **Đo trước khi viết: thay hộp thoại từ công cụ e2e của giao diện.**
   - Trong một script tạm, không nằm trong dự án, mở ứng dụng thật theo đúng cách của `walkthrough_harness.ts`.
   - Gán đè `dialog.showOpenDialog` qua `electronApp.evaluate`, như `native_dialogs-EXP-003`.
   - Từ trang, gọi `window.commissionTracker.invoke('dialog:pick-folder', {})`.
   - Ghi lại ba điều: câu trả lời; không hộp thoại thật nào hiện; và nguyên văn `message` của Promise bị từ chối khi hàm thay thế ném lỗi. Electron bọc thêm chữ quanh lỗi, nên **giao diện không được dựa vào chữ đó**.
   - Không làm được thì dừng lại và báo; không thêm cờ vào Desktop.

3. **Nền: `invoke` và `ipc_bridge`** (I2, sửa Main và `scaffold_ui`).
   - **`LAYER_CONFIGS.launch`:** thêm tên thuộc tính `invoke`, nhãn `[CONTRACT]` (data_schema 6.1.0, luật renderer; api_contract 4.0.0, `endpoint_forms.ipc`).
   - **Main** (`src/main.tsx`): `readLaunchValues` đọc thêm `invoke`. Không phải hàm thì hiện màn hình lỗi khởi động, kèm tên giá trị. Chỉ Main đọc bridge (R12).
   - **`scaffold_ui`:** thêm `createIpcBridge(invoke)`, trả tài nguyên `ipc_bridge` với đúng một việc: `call(address, argument): Promise<unknown>`, chuyển nguyên lời gọi sang `invoke`.
     - Không kiểm hình dạng: việc đó của workflow dùng nó.
     - Không thêm hạn chờ, vì hộp thoại chờ người dùng.
     - Không bắt lỗi: Promise bị từ chối đi thẳng lên Adapters của workflow.
   - **Kiểm thử Main** trong jsdom: thêm ca bridge thiếu `invoke`, và ca `invoke` không phải hàm. Mọi bridge giả của các kiểm thử đang có phải thêm `invoke`. Chỉ thêm khóa đó, không đổi gì khác của các ca cũ.
   - **Kiểm thử `ipc_bridge`:** chuyển đúng địa chỉ và đối số; trả đúng giá trị; Promise bị từ chối thì vẫn bị từ chối.

4. **Logic: workflow giao diện `backup_data`** (I3), đủ các thành phần.
   - **Configs:**
     - `contract.dataSchema: '9.0.3'`, `apiContract: '4.0.0'`;
     - địa chỉ `dialog:pick-folder` và `purpose: 'manual'`, nhãn `[CONTRACT]`;
     - câu chữ và luật trình bày đúng `ui_decomposition.md`.
   - **Adapters** nhận cả `http_client` lẫn `ipc_bridge`:
     - `pickFolder()`: `ipc_bridge.call(address, {})`, rồi kiểm hình dạng bằng Zod, đúng luật ở đặc tả. Kết quả là chọn, hủy, Promise bị từ chối, hay vi phạm hợp đồng.
     - `createBackup(destinationDir)`: `POST /backups` với thân `{ backup_request: { destination_dir, purpose: 'manual' } }`. Kiểm `backup_archive_record` bằng Zod: `created_at` đúng `formats.timestamp`; `size_bytes` là số nguyên an toàn ≥ 0; ba chuỗi còn lại có mặt.
   - **Services:**
     - luồng hai bước (chọn thư mục, rồi tạo bản sao lưu);
     - câu thông báo cho từng kết quả;
     - định dạng dung lượng và lúc tạo;
     - khung kết quả bị xóa khi kết quả không phải 201.
   - **Routers:** một lối vào cho thao tác "Tạo bản sao lưu".
   - **Kiểm thử bắt buộc**, ngoài ma trận I3.6:
     - **hình dạng `pick_folder`:**
       - hợp lệ: `{status:200, body:{canceled:true, path:null}}` và `{status:200, body:{canceled:false, path:'C:\\x'}}`;
       - vi phạm hợp đồng: `canceled:true` với `path` khác `null`; `canceled:false` với `path: null` hay `''`; thiếu `body`; `status` 400; giá trị không phải đối tượng;
     - **luồng:**
       - hủy thì không gọi `createBackup`;
       - Promise bị từ chối thì không gọi `createBackup` và cho ra đúng câu;
       - chọn thì gọi `createBackup` đúng một lần, với đúng đường dẫn và `purpose: 'manual'`;
     - **dung lượng:** `0` → "0 byte", `1023` → "1023 byte", `1024` → "1,0 KB", `1048575` → "1024,0 KB", `1048576` → "1,0 MB". Ghi rõ cách làm tròn đã chọn;
     - **201 với hình dạng sai** (thiếu trường, `created_at` sai dạng, `size_bytes` âm hay không phải số nguyên): vi phạm hợp đồng;
     - **400, 500:** đúng câu, và khung kết quả cũ bị xóa.

5. **Kit** (I4).
   - Khung kết quả gồm ba dòng nhãn và giá trị. Dựng bằng component sẵn có nếu được; nếu cần component mới, ghi lý do.
   - Đường dẫn dài phải xuống dòng được (đặc tả). Làm bằng thuộc tính CSS trong kit, qua token nếu cần, không viết style trong trang (R7).
   - `check_contrast.mjs` phủ mọi component mới hoặc mở rộng. Mọi component export qua `kit/index.ts` (R9).

6. **Màn hình** (I5).
   - **Trang và hook `backup`,** theo mẫu các trang đã có:
     - hàng nút dưới tiêu đề;
     - dòng chữ phụ dưới hàng nút;
     - trạng thái "Đang tạo bản sao lưu…";
     - nút bị vô hiệu suốt luồng.
   - **Điều hướng:** thêm khóa `backup` (không tham số) vào bảng điều hướng. Mục "Sao lưu" đứng sau "Nhắc việc"; năm mục cũ giữ nguyên vị trí.
   - **Ráp nối:** ráp `backup_data` ở Main và `logic_context`; Main trao `ipc_bridge` cho Adapters của nó.
   - **Kiểm thử dựng trang:**
     - mọi kết quả của bảng lời gọi ở đặc tả, gồm hủy, Promise bị từ chối, sai hình dạng, 201, 400, 500, không tới được, vi phạm hợp đồng;
     - lần vẽ đầu: không gọi gì, không có khung kết quả;
     - bấm hai lần liên tiếp chỉ gọi `pickFolder` một lần;
     - nút bị vô hiệu trong lúc hộp thoại mở và trong lúc gửi;
     - lần thứ hai thành công thay khung kết quả;
     - vùng điều hướng có sáu mục đúng thứ tự.
   - Không đổi hành vi của các trang đã `hoàn_tất`; chỉ thêm mục điều hướng.
   - Sửa các spec và kiểm thử đang đếm đúng năm mục điều hướng, như phiên 27 đã làm khi thêm "Nhắc việc". Chỉ thêm mục "Sao lưu", không đổi gì khác.

7. **Kịch bản bấm thử và e2e** (I6.3).
   - **`walkthrough.yaml` mới cho `backup`**, theo luật phủ của chặng E.
   - **Hộp thoại thay thế** trong e2e và lần chạy có runner: một hàm của công cụ kiểm thử (ví dụ trong `walkthrough_harness.ts`) gán đè `dialog.showOpenDialog` qua `electronApp.evaluate`, theo kết quả đo ở việc 2.
     - Hàm nhận thư mục sẽ "chọn", hoặc lệnh "hủy".
     - Thư mục đích là thư mục tạm của lần chạy, cạnh thư mục dữ liệu tạm, **không** trong `UI/`, `%APPDATA%` hay thư mục của người dùng. Dọn sau lần chạy như thư mục dữ liệu tạm.
   - **Công cụ kiểm thử gọi `prepare_restore`:** sau bước tạo bản sao lưu, công cụ gọi `POST /backups/restore-preparations` với `archive_path` vừa hiện, rồi khẳng định `is_valid` và `is_compatible` đều `true`. Gọi từ `UI/tests/`, **không** từ `UI/src/`. Tệp chờ mà lời gọi này tạo nằm trong thư mục dữ liệu tạm; không cần dọn riêng.
   - **Lần Project Owner chạy tay:** `npm run walkthrough:app` dùng hộp thoại thật, không thay gì. Viết **các bước bấm tay** cho kịch bản. Trong đó có bước ghi tiêu đề hộp thoại ("Chọn thư mục"), và bước mở thư mục đã chọn trong Explorer để thấy tệp `.ctbackup`.
   - Tín hiệu "đã tải xong" là nội dung đã hiện. Khẳng định chữ trên `role="status"` phải lọc theo chữ (UI-10).
   - **Chạy:**
     - spec mới chạy riêng **10 lần liên tiếp**;
     - `npm run e2e` **5 lần liên tiếp**, từng lượt một, có `CT_WALKTHROUGH_RUNNER=coding-agent@<ngày>#<số>`;
     - một lần không đặt biến; sau lần đó `UI/evidence` giống hệt trạng thái sau các lượt có runner;
     - mọi lần hỏng đều tính, và đếm lại từ đầu;
     - Project Owner dùng máy bình thường trong lúc e2e chạy (như phiên 28 tới 31).

8. **DSK-16: bản đóng gói.** Khung chính có thêm mục điều hướng, nên chạy trong `Desktop/` (chỉ chạy, không sửa gì ở Desktop):
   - xóa `packaging\stage` và `release`;
   - nếu `npm run dist` hỏng EXDEV trong sandbox, đặt `ELECTRON_BUILDER_CACHE` vào một thư mục tạm, như phiên 33;
   - `npm run dist`, rồi `npm run test:packaged`: mốc **9**, phải đạt cả 9.

   Hỏng ở chỗ phải sửa Desktop thì dừng lại và báo, không sửa.

9. **Tự kiểm I6** cho `backup`, đủ năm góc. Đối chiếu bảy nguyên tắc §7.2, đặc biệt:
   - nguyên tắc 1: một hành động chính;
   - nguyên tắc 4: phản hồi sau thao tác;
   - nguyên tắc 5: lý do không hỏi xác nhận.

   Ghi vào checkpoint `screens`.

10. **Checkpoint** (Giao thức 07; mọi khối `clause: external`):
    - khối mới `backup_data` (logic);
    - `scaffold_ui`: tài nguyên `ipc_bridge`;
    - `main`: `invoke` bắt buộc, ráp nối mới, kết quả đo ở việc 2, mốc kiểm thử;
    - `kit`: component mới hoặc mở rộng, nếu có;
    - `screens`: trang mới, mục điều hướng, tự kiểm I6, **đề xuất** trạng thái trang.
    - **Giờ ghi trong checkpoint:** chép **nguyên** giá trị `Get-Date -Format o` lấy ngay trước khi ghi; không ước lượng, không làm tròn (BE-8).

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **DSK-16:** việc 8.
- **DSK-22** (Desktop, `native_dialogs-PROB-001` và ca thứ tự đăng ký): việc của layer desktop, không làm ở phiên này. Khối checkpoint `native_dialogs` còn `UNSOLVED_PROBLEMS`; đó là việc dọn checkpoint của Desktop, không chặn phiên này.
- **UI-6** (phần V2), **UI-7:** không làm.
- **Giới hạn R13 đã khai:** chấp nhận ở V1.
- **Phép kiểm tĩnh `lint:e2e`** không bắt locator gán vào biến trước (Q21-1): đừng viết kiểu đó.
- **ENV-7** (`npm audit`): không chạy `npm audit fix`, không đổi phụ thuộc.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `endpoint_forms.ipc`: renderer gọi `invoke(address, argument)` trên bridge; câu trả lời là `{ status, body }`; renderer không bao giờ chạm `ipcRenderer`.
- `native_dialogs.pick_folder`: `address: "dialog:pick-folder"`, `called_by: [external]`, `input: none`, output `200: { canceled: boolean, path: file_path|null }`. Chỉ trình bày: đường dẫn chọn được đi vào workflow như đầu vào `end_user`, qua `POST /backups`.
- `backup_request_record` = `{ destination_dir: file_path, purpose: 'manual' | 'pre_restore' }`. Giao diện luôn gửi `'manual'`.
- `backup_archive_record` = `{ archive_path: file_path, app_version: string, size_bytes: integer, sha256: string, created_at: timestamp }`.
- `create_backup`: `201 backup_archive`, `400 ERR_VALIDATION`, `500 ERR_STORAGE_IO`. Không có 404 hay 409.
- `prepare_restore`: `called_by: [restore_data]`. **Không** có trong `UI/src/`.
- `error_body.details` không có hình dạng trong hợp đồng: không đọc.
- Bridge có đúng hai khóa `backendBaseUrl` và `invoke`; chỉ Main của UI đọc nó.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- ⚠ **Không có màn hình hồ sơ quyền sở hữu** (`/watermark-profiles`, `/watermark-strengths`).
- ⚠ **Không gọi `POST /backups/restore-preparations` từ mã trong `UI/src/`.** Chỉ công cụ kiểm thử trong `UI/tests/` được gọi.
- Không làm khôi phục (chặng F chưa quyết). Không gọi `dialog:open-file`, `dialog:save-file` (Desktop chưa có). Không thêm lời gọi nào ngoài hai lời gọi của bảng chặng E.
- Không sửa Desktop, không sửa Backend. Không sửa tệp nào ngoài `UI/`. Được **chạy** Desktop và Backend, kể cả `npm run dist` và `test:packaged`. Không thêm cờ `--ct-test-*`.
- Không đổi hành vi của các trang `hoàn_tất`. Chỉ thêm mục "Sao lưu".
- Không dùng `window.confirm`, `alert` hay hộp thoại gốc nào ngoài `pick_folder` của Desktop. Không nhớ thư mục hay kết quả qua `localStorage` hay nơi lưu nào khác.
- Không nới thời gian chờ (của ca kiểm thử, của Playwright, hay hạn chờ 15 s của `http_client`). Không thêm `retries`, không đánh dấu `skip`, `fixme` hay `flaky`. Không gọi `focus()`, `moveTop()`, `restore()` trên cửa sổ ngoài cơ chế có sẵn của `window_guard`.
- Không làm các mục V2. Không gọt giao diện: không animation, không transition, không hiệu ứng trang trí, không giao diện sáng, không thư viện hay component từ nguồn ngoài.
- Không tắt luật, không thêm `eslint-disable`. Ngoại lệ lint mới phải liệt kê trong báo cáo, kèm lý do.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không kiểm thử nào đụng `%APPDATA%\CommissionTracker` thật. Không kiểm thử nào ghi tệp sao lưu ra ngoài thư mục tạm của lần chạy.
- Không tắt, không đổi cấu hình antivirus.
- Không nhân sub-agent. Không chạy song song hai lệnh e2e, hai lệnh `check`, hay hai bản ứng dụng.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên Windows:

1. **Việc 2 đã đo:** báo cáo có câu trả lời của `invoke` với hộp thoại thay thế, và nguyên văn `message` khi hàm thay thế ném lỗi.
2. **Nền:**
   - Main bắt buộc có `invoke`, kèm hai ca kiểm thử mới;
   - `scaffold_ui` có `ipc_bridge`, kèm kiểm thử;
   - chỉ Main đọc bridge.
3. **Workflow `backup_data`:**
   - có đủ thành phần;
   - Configs ghi Data Schema 9.0.3;
   - đủ các ca kiểm thử bắt buộc của việc 4.
4. **Trang `backup`:**
   - chạy đúng đặc tả;
   - kiểm thử dựng trang phủ mọi kết quả;
   - các trang `hoàn_tất` không đổi hành vi;
   - không có lời gọi `prepare_restore` nào trong `UI/src/`.
5. `npm run check` đạt, kể cả `lint:e2e`; số kiểm thử cao hơn mốc 1555.
6. **E2e:**
   - spec mới chạy riêng đạt 10/10;
   - `npm run e2e` đạt **5/5 lần liên tiếp**, số e2e cao hơn mốc 70;
   - một lần không đặt biến để `UI/evidence` nguyên vẹn;
   - bước `ok` của e2e chứng minh tệp tạo từ giao diện qua được `prepare_restore` (`is_valid` và `is_compatible` đều `true`).
7. Kịch bản bấm thử chạy trên hệ thống thật, có ảnh và đúng tên người chạy.
8. `npm run dist` từ trạng thái sạch và `npm run test:packaged` (9/9) đạt.
9. Tự kiểm I6 đủ năm góc.
10. **Checkpoint** theo Giao thức 07, giờ lấy bằng lệnh:
    - `backup_data` (mới), `scaffold_ui`, `main`, `screens`, cùng `kit` nếu có thay đổi;
    - không có `UNSOLVED_PROBLEMS`, trừ khi có ghi rõ.
11. Mốc `%APPDATA%` không đổi.
12. `git status --short` cuối phiên chỉ có tệp trong `UI/`. Liệt kê trong báo cáo.
13. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
    - kết quả đo ở việc 2;
    - các lệnh để Project Owner tự chạy;
    - **các bước bấm tay** cho kịch bản `backup`, với hộp thoại thật;
    - kết quả `test:packaged`;
    - đề xuất trạng thái trang;
    - danh sách ngoại lệ lint mới, nếu có.
