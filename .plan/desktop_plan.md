# ===WCA-PLAN===
# session_for: desktop
# drafted_by: Orchestrator + Project Owner
# drafted_at: 2026-10-04T20:10:00+07:00
# contract: data_schema 9.0.2, api_contract 4.0.0 (approved)

## MỤC TIÊU PHIÊN NÀY

Phiên 30 của dự án, phiên desktop thứ năm (sau phiên 10, 13, 14 và 26). Hai mục:

| Mục | Việc | Mức |
|---|---|---|
| **DSK-17** | Thành phần cắt ngang `reminder_ticker`: gọi `send_reminder.check_due` theo nhịp, hiện một thông báo Windows cho mỗi nhắc việc trả về. Đây là phần còn lại của chặng D6 | trung bình, thuộc V1 |
| **DSK-18** | Cờ kiểm thử mới, chỉ cho bản chạy từ mã nguồn: cửa sổ hiện lên **không** giành tiêu điểm, để e2e không chiếm phím của người đang dùng máy | trung bình (Project Owner chọn phương án A, 2026-10-04) |

Đặc tả dự kiến của `reminder_ticker` nằm ở `.plan/open_issues.md`, mục DSK-17 ("Đặc tả dự kiến cho phiên 30"). Plan này **chốt** đặc tả đó, kèm cách làm và tiêu chí. Chỗ nào plan nói khác `open_issues` thì theo plan.

**Điểm dừng:**
- `npm test` và `npm run test:packaged` của Desktop đạt;
- thông báo Windows đã hiện thật, Project Owner xác nhận bằng mắt;
- `npm run e2e` của UI đạt với Main mới;
- mốc `%APPDATA%` không đổi.

Không có workflow mới của desktop, không có lối vào `ipc` mới, không đổi preload, không đổi thứ tự khởi động hay cách dừng backend.

## ĐẶC TẢ ĐÃ CHỐT

### `reminder_ticker` (DSK-17)

Căn cứ: API Contract 4.0.0, `clause_a_common.cross_cutting.reminder_ticker`, `send_reminder.check_due`; Data Schema 9.0.2, `send_reminder` (`new_notifications`, `description`), `types.reminder_notification_record`; lý thuyết WCA §5 (hạ tầng cắt ngang).

- **Vị trí:** `Desktop/src/cross_cutting/reminder_ticker/` (`CLAUDE.md` mục 4). Không có năm lớp. Không quyết định nghiệp vụ: không lọc, không chọn, không sắp lại; không đánh dấu đã xem; không giữ dữ liệu nghiệp vụ.
- **Nhận từ Main lúc khởi tạo:** địa chỉ backend, các giá trị cấu hình của ticker, chữ thông báo, và một hàm "đưa cửa sổ lên trước" (công cụ của Main, như lúc có lần mở thứ hai). Ticker không tự đọc `configs/desktop.json`.
- **Khởi động:**
  - Main khởi động ticker sau khi backend `READY` **và** cửa sổ đã nạp lần đầu, kể cả trường hợp nạp lần đầu bị bỏ dở mà không lỗi (`ERR_ABORTED`).
  - Lần kiểm đầu tiên chạy **ngay**, để nhắc việc đến hạn trong lúc ứng dụng đóng hiện ra khi mở. Sau đó theo nhịp cố định.
- **Nhịp:** giá trị nội bộ của ticker trong `configs/desktop.json`, mặc định **60 000 ms**.
  - Không bắt đầu lần kiểm mới khi lần trước chưa xong.
  - Mỗi lời gọi có hạn chờ riêng, trong config (đề xuất 10 000 ms).
- **Lời gọi:** `POST /reminders/checks`, không thân; nhãn khai báo: 200 `new_notifications`, 500 `ERR_STORAGE_IO`.
- **Mỗi nhắc việc trả về, một thông báo Windows**, theo thứ tự trả về. Chữ tiếng Việt nằm trong `configs/desktop.json`, dựng từ các trường của nhắc việc, cùng lời với trang `reminder_list`:
  - `kind = 'deadline'`: tiêu đề "Sắp tới hạn giao: `<title>`"; nội dung "Hạn giao `dd/mm/yyyy` · nhắc trước `<amount>` ngày|giờ". Ngày cắt từ chuỗi `deadline`, không đổi múi giờ.
  - `kind = 'periodic_digest'`: tiêu đề "Tổng hợp định kỳ: `<open_count>` đơn đang mở"; nội dung "`<số phần tử của upcoming>` đơn có hạn giao", thêm " · sớm nhất: `<title>` (`dd/mm/yyyy`)" lấy phần tử đầu khi `upcoming` không rỗng.
- **Bấm thông báo:** chỉ đưa cửa sổ lên trước (mở lại nếu đang thu nhỏ, rồi focus). Không mở trang nào, không đánh dấu đã xem. Nếu cửa sổ đã đóng thì không làm gì.
- **Lỗi:** 500, không tới được, hết hạn chờ, hay thân trả về sai hình dạng: ghi log, không hiện gì, thử lại ở nhịp sau; ứng dụng không dừng.
  - Một phần tử sai hình dạng (thiếu trường, `kind` lạ, trường bắt buộc theo `kind` là `null`): bỏ riêng phần tử đó, ghi log; các phần tử khác vẫn hiện.
  - Kiểm hình dạng ở mức tối thiểu đủ để dựng chữ, không kiểm lại luật nghiệp vụ.
- **Dừng:** ticker dừng (hủy hẹn giờ, bỏ qua kết quả của lời gọi đang dở) **trước** khi Main dừng backend, ở mọi đường thoát: đóng cửa sổ, `before-quit`, tín hiệu, `fatal`.
- **Kiểm được không cần mắt người:**
  - mỗi thông báo ghi một dòng log có `notification_id`, tiêu đề và nội dung, ví dụ `reminder toast: {"notification_id":"…","title":"…","body":"…"}`;
  - mỗi lần kiểm hỏng ghi một dòng log có lý do;
  - sự kiện `show` và `failed` của thông báo (nếu Electron 44.4.5 có) cũng ghi log.
- **Cờ kiểm thử, chỉ cho bản chạy từ mã nguồn:** `--ct-test-reminder-interval-ms=<số>` rút ngắn nhịp cho kiểm thử. Thêm vào `test_flags` và vào `packaged.ignored_test_flags` của `configs/desktop.json`, để bản đóng gói bỏ qua như mọi cờ khác.

### Cờ hiện cửa sổ không giành tiêu điểm (DSK-18)

- Cờ mới `--ct-test-show-inactive`, chỉ cho bản chạy từ mã nguồn; thêm vào `test_flags` và `packaged.ignored_test_flags`.
- **Có cờ:** Main tạo `BrowserWindow` với `show: false`, rồi gọi `showInactive()` khi cửa sổ sẵn sàng hiện (`ready-to-show`, hoặc sự kiện tương đương mà agent tra trong `electron.d.ts` 44.4.5; ghi nguồn).
- **Không cờ:** hành vi như hiện nay, cửa sổ hiện ra và được kích hoạt. Đây là hành vi đúng khi người dùng mở ứng dụng.
- Mọi điều khác của cửa sổ không đổi: kích thước, `webPreferences`, preload, chặn điều hướng.
- Bước giao diện (thêm cờ vào `launchArgs` của công cụ kiểm thử và vào `main_layout.spec.ts`) làm ở **phiên giao diện sau**, không làm ở phiên này (UI-18).

## VIỆC CẦN LÀM, THEO THỨ TỰ

0. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1:
   - `CLAUDE.md`: mục 2 (git), mục 4 (bố cục `Desktop/`, `cross_cutting/`), mục 5 (Desktop, cờ kiểm thử, đóng gói), mục 6;
   - lý thuyết WCA §5 (hạ tầng cắt ngang); `04-implement.md` về hạ tầng cắt ngang và Main;
   - `.plan/open_issues.md`: **DSK-17**, **DSK-18**, UI-18 (bối cảnh), UI-15 (vì sao ticker không phá e2e của giao diện), DSK-16 (`test:packaged`), BE-8 (giờ trong checkpoint);
   - hợp đồng:
     - `api_contract.yaml`: `clause_a_common.cross_cutting.reminder_ticker`, `endpoint_forms.http`, `error_body`, `send_reminder.check_due`;
     - `data_schema.yaml`: `send_reminder` (toàn mục, nhất là `description`), `types.reminder_notification_record`, `formats.date`, `clause_a_common.mandatory_rules`, `shared_values`;
   - `.design/ui_decomposition.md`, mục "Chặng D6", phần chữ của `reminder_list` (để thông báo cùng lời);
   - `Desktop/configs/desktop.json`; toàn bộ khối checkpoint ở đầu `Desktop/src/main.ts`; `main()` và `startLayer()`;
   - `Desktop/tests/desktop_main.spec.ts`, `Desktop/tests/helpers.ts`, `Desktop/tests/packaged/packaged_app.spec.ts`;
   - plan này sau cùng.

   Xác nhận Data Schema **`9.0.2`** và API Contract **`4.0.0`**, cả hai `approved`, và `send_reminder` ở `đã_hoàn_thiện`. Sai thì dừng lại và báo.

1. **Môi trường và mốc.**
   - Ghi phiên bản Node, npm, Electron, Python; trạng thái AVG và ReasonLabs theo lời Project Owner.
   - Trong `Desktop/`: `npm ci`; `npm run lint`; `npm test` (mốc **17 đạt**). Trên Windows, mọi ca phải đạt.
   - Trong `UI/`: `npm run build`.
   - Chụp mốc `%APPDATA%\CommissionTracker` (kích thước, SHA-256 và thời điểm ghi của từng tệp).
   - Ghi `git status --short` (chỉ đọc).

2. **Tra cứu và đo thông báo Windows** (trước khi viết ticker).
   - Tra `electron.d.ts` của Electron 44.4.5 cho `Notification` (hàm dựng, `isSupported()`, `show()`, sự kiện `show`, `click`, `failed`, `close`), và cho `app.setAppUserModelId`. Ghi nguồn và số dòng.
   - **Orchestrator không nắm chắc** thông báo của Electron 44 trên Windows có cần Application User Model ID hay không, và cần khi nào: khi chạy từ mã nguồn, từ `release\win-unpacked`, hay từ bản cài. **Đo**, không đoán:
     - viết một công cụ đo nhỏ trong `Desktop/tests/` (không phải mã của Main) hiện một thông báo thử và ghi `isSupported()` cùng các sự kiện nhận được;
     - đo khi chạy từ mã nguồn, có và không có `app.setAppUserModelId(<appId>)`;
     - nếu cần AUMID: giá trị lấy từ config, và phải khớp `appId` của `electron-builder.yml` (`com.commissiontracker.desktop`). Có kiểm thử khẳng định hai giá trị khớp.
   - **Không** sửa registry, không tự tạo lối tắt Start Menu, không cài bộ cài NSIS lên máy.
   - Lưu ý: Windows có thể ẩn thông báo khi đang bật Focus Assist hay Do Not Disturb. Hỏi Project Owner trạng thái đó trước khi kết luận "không hiện".
   - **Nếu đo cho thấy thông báo không hiện được khi chạy từ mã nguồn** dù đã thử AUMID: dừng DSK-17 ở đó, báo số đo. Không tìm cách vòng.

3. **DSK-18: cờ `--ct-test-show-inactive`.** Làm sớm, để mọi lần chạy ứng dụng trong kiểm thử của Desktop sau đó dùng được nó.
   - Thêm cờ theo "Đặc tả đã chốt".
   - **Kiểm thử tự động** (trong `desktop_main.spec.ts` hoặc tệp mới cạnh nó):
     - có cờ: sau khi cửa sổ nạp xong, cửa sổ hiện (`isVisible()` true) nhưng không phải cửa sổ có tiêu điểm của hệ điều hành, đo trong lúc một tiến trình khác giữ nền trước (tham khảo cách đo của `UI/tests/tools/ui18_probe.mjs`: một tiến trình PowerShell riêng giữ nền trước; đọc chủ nền trước bằng `GetForegroundWindow`);
     - không cờ: cửa sổ vào nền trước như cũ;
     - bản đóng gói bỏ qua cờ (ca trong `packaged_app.spec.ts`, hoặc khẳng định qua dòng log `argvForLog` như các cờ bị bỏ qua khác).
   - **Phép cắn:** bỏ phần xử lý cờ thì ca "có cờ" hỏng. Ghi số liệu.

4. **DSK-17: `reminder_ticker`.**
   - Viết theo "Đặc tả đã chốt". Hàm dựng chữ thông báo là hàm thuần, kiểm được riêng.
   - Main: đọc config, khởi tạo ticker, trao các giá trị và hàm "đưa cửa sổ lên trước", khởi động đúng lúc, dừng trước backend.
   - **Kiểm thử tự động**, chạy với backend thật và `--ct-test-data-dir` tạm:
     - **dựng chữ** (hàm thuần): nhắc việc hạn giao, mốc ngày và mốc giờ; tổng hợp có và không có `upcoming`; phần tử sai hình dạng bị bỏ;
     - **luồng thật:** tạo dữ liệu qua HTTP tới backend của ứng dụng đang chạy (một đơn có hạn giao hôm nay, cài đặt bật nhắc trước hạn giao "1 ngày"), dùng `--ct-test-reminder-interval-ms` nhịp ngắn; khẳng định có dòng log `reminder toast:` đúng tiêu đề và nội dung; khẳng định `GET /reminders/pending` vẫn còn nhắc việc đó (ticker không đánh dấu đã xem);
     - **lần kiểm đầu chạy ngay:** nhắc việc đã đến hạn trước khi mở ứng dụng thì hiện ở lần kiểm đầu, không chờ hết một nhịp;
     - **lỗi:** một backend giả trong `tests/fixtures/` trả 500, rồi trả thân sai hình dạng, cho `POST /reminders/checks`: có dòng log lỗi, không có `reminder toast:`, ứng dụng vẫn chạy, rồi đóng sạch với mã 0;
     - **không chồng lời gọi:** backend giả trả lời chậm hơn nhịp; khẳng định không có hai lời gọi `POST /reminders/checks` cùng lúc;
     - **dừng trước backend:** trong log, ticker dừng trước dòng dừng backend, và không còn lời gọi nào sau đó.
   - **Phép cắn:** ít nhất hai: (a) bỏ lần kiểm đầu chạy ngay thì ca tương ứng hỏng; (b) cho phép chồng lời gọi thì ca tương ứng hỏng. Ghi số liệu, khôi phục.
   - **Thông báo thật:** chạy ứng dụng từ mã nguồn với dữ liệu mẫu có nhắc việc. Dữ liệu tạm, không đụng `%APPDATA%`. Cách dễ nhất: `npm run walkthrough:app -- --reminders` trong `UI/`. Xin Project Owner xác nhận bằng mắt:
     - thông báo hiện, đúng chữ;
     - bấm thông báo thì cửa sổ ứng dụng lên trước;
     - trang "Nhắc việc" vẫn hiện nhắc việc đó cho tới khi bấm "Đã xem".

     Chụp ảnh thông báo nếu được, đặt ở `Desktop/evidence/dsk17/`.

5. **Checkpoint** (Giao thức 07):
   - `reminder_ticker` là hạ tầng cắt ngang. Đặt khối checkpoint của nó ở tệp chính của `src/cross_cutting/reminder_ticker/`, theo vị trí Giao thức 07 quy định cho thành phần không có Services; ghi lý do chọn vị trí.
   - Main (`src/main.ts`): EXPERIENCES và EVIDENCE cho việc ráp ticker, cờ DSK-18, kết quả đo thông báo (bước 2).
   - **Giờ ghi:** chép **nguyên** giá trị của `Get-Date -Format o` lấy ngay trước khi ghi; không ước lượng, không làm tròn (BE-8).

6. **Chạy toàn bộ**, khi AVG và ReasonLabs đều bật:
   - `Desktop`:
     - `npm run lint`;
     - `npm test` đạt đủ (17 cộng số ca mới), **3 lần liên tiếp**;
     - xóa `packaging/stage` và `release` rồi `npm run dist`;
     - `npm run test:packaged` đạt (6 cộng số ca mới). Ghi rõ: ticker có chạy trong bản đóng gói, và lần kiểm đầu không lỗi (đọc log).
   - `UI`: `npm run e2e` **không** đặt `CT_WALKTHROUGH_RUNNER`, **3 lượt liên tiếp** đạt 70/70, chạy từng lượt một.
     - Ticker giờ chạy trong mọi ứng dụng e2e mở và gọi `check_due`. Dữ liệu mẫu D6 đã chịu được điều này (UI-15). `reminder_seed_ticker.spec.ts` và `reminder_list_walkthrough.spec.ts` phải đạt.
     - Sau đó `git status --short UI/evidence` phải trống.
     - Trong các lượt có `reminder_list`, thông báo Windows thật sẽ hiện. Đó là hành vi đúng; báo trước cho Project Owner.
   - Chụp lại mốc `%APPDATA%`: phải giống mốc ở việc 1.

## KẾ THỪA TỪ CHECKPOINT — vấn đề tồn đọng

- **DSK-9** (ký số, biểu tượng), **DSK-11** (mã thoát 3), **DSK-8** (chỉ quan sát): không làm.
- **DSK-16:** `test:packaged` chạy trong phiên này (việc 6).
- **ENV-7** (`npm audit`): không chạy `npm audit fix`, không đổi phụ thuộc.

## RÀNG BUỘC CẦN NHỚ TỪ HỢP ĐỒNG

- `check_due` có `called_by: [reminder_ticker]`: chỉ ticker gọi nó. Giao diện không gọi.
- Theo hợp đồng, mỗi nhắc việc đến hạn được trao ra **một lần**, rồi nằm trong danh sách đang chờ tới khi họa sĩ đánh dấu đã xem. Ticker không đánh dấu đã xem, không giữ, không gọi lại để "lấy lại" nhắc việc.
- Hạ tầng cắt ngang chỉ làm việc kỹ thuật: kích hoạt theo thời gian, chuyển tiếp, trình bày. Dựng chữ thông báo từ các trường là trình bày, được phép. Lọc hay chọn nhắc việc nào để hiện là quyết định, không được phép.
- `shared_values.db_file_path` là `%APPDATA%/CommissionTracker/data.db`. Mọi lần chạy ứng dụng trong phiên, kể cả bản đóng gói, đều kèm `--ct-test-data-dir` trỏ vào thư mục tạm.
- Backend dừng bằng việc đóng stdin. Không đổi cách dừng, không đổi thứ tự khởi động.
- Preload và bridge (`shared_values.renderer_bridge`) không đổi. Không thêm lối vào `ipc`.

## CẢNH BÁO — điều KHÔNG được làm trong phiên này

- Không sửa tệp nào ngoài `Desktop/`. Được **chạy** các lệnh của `Backend/` và `UI/`. Không chạy UI e2e với `CT_WALKTHROUGH_RUNNER`.
- Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
- **Không tắt, gỡ hay đổi cấu hình phần mềm diệt virus nào**, kể cả tạm thời. Không thêm ngoại lệ cho `powershell.exe`.
- Không sửa registry, không tạo lối tắt Start Menu, không cài bộ cài lên máy.
- Không đổi chữ của dòng log `FATAL:`. Không đổi hành vi khi người dùng mở ứng dụng (không cờ thì cửa sổ vẫn hiện và được kích hoạt).
- Không thêm workflow cho desktop, không lối vào `ipc` mới, không đổi preload.
- Không ký số, không thêm biểu tượng, không auto-update, không khay hệ thống.
- Không tăng `ready_timeout_ms` hay thời gian chờ nào sẵn có. Không `retries`, không `skip`.
- Không tắt luật lint, không thêm `eslint-disable`, không viết kiểm thử luôn đạt.
- Không chạy `git commit`, `push`, `reset`, `checkout`, `restore`, `stash` hay lệnh nào đổi trạng thái kho. Chỉ được đọc.
- Không kiểm thử hay lần chạy nào đụng `%APPDATA%\CommissionTracker` thật.
- Không dùng sub-agent. Không chạy song song hai lệnh e2e hay hai bản ứng dụng.
- ⚠ Ràng buộc V1: không màn hình hồ sơ quyền sở hữu. Phiên này không làm giao diện.

## TIÊU CHÍ HOÀN TẤT PHIÊN

Phiên xong khi **tất cả** những điều dưới đây đúng, trên máy Project Owner, với antivirus đang bật:

1. **Đo thông báo (việc 2):** có nguồn tài liệu, có số đo khi chạy từ mã nguồn (có và không có AUMID), có kết luận. Nếu dùng AUMID thì giá trị lấy từ config và khớp `appId`, có kiểm thử.
2. **DSK-18:** cờ `--ct-test-show-inactive` theo đặc tả; có kiểm thử có cờ và không cờ, phép cắn; bản đóng gói bỏ qua cờ.
3. **DSK-17:**
   - `reminder_ticker` theo đặc tả, ở `src/cross_cutting/reminder_ticker/`;
   - đủ các ca kiểm thử ở việc 4, phép cắn (a) và (b);
   - Project Owner xác nhận bằng mắt: thông báo hiện đúng chữ, bấm thì cửa sổ lên trước, nhắc việc còn trong danh sách.
4. `npm run lint`; `npm test` 3 lần liên tiếp đạt; `npm run dist` từ trạng thái sạch; `npm run test:packaged` đạt; `npm run e2e` của UI 3 lượt liên tiếp đạt 70/70, `UI/evidence` không đổi.
5. Mọi lần chụp mốc `%APPDATA%` giống nhau.
6. Checkpoint của Main và của `reminder_ticker`: YAML hợp lệ, `UNSOLVED_PROBLEMS: []` hoặc ghi rõ việc còn lại; giờ đúng quy ước BE-8.
7. `git status --short` cuối phiên chỉ có tệp trong `Desktop/`. Liệt kê trong báo cáo.
8. Báo cáo cuối phiên theo `CLAUDE.md` mục 5, kèm:
   - bảng DSK-17, DSK-18: trạng thái và bằng chứng;
   - kết quả đo thông báo;
   - các lệnh, và các bước để Project Owner tự xem thông báo;
   - danh sách ngoại lệ lint mới, nếu có.
