# AUDIT — PHIÊN 28 (LAYER GIAO DIỆN, VÁ NGẮN: UI-11 BƯỚC 4, UI-13, UI-15)

*Orchestrator, 2026-10-04. Đối chiếu với `.plan/ui_plan.md` (plan phiên 28), `.plan/open_issues.md` (UI-11, UI-13, UI-15), Data Schema 9.0.2 (`send_reminder`), API Contract 4.0.0 (`send_reminder.check_due`, `list_pending`), skill `iwca-implementation`, và ba khối checkpoint `main`, `screens`, `send_reminder`. Định danh phiên của agent: `coding-agent@2026-10-03#2`. Mốc so sánh: commit `8c752b3`. Orchestrator đã xác nhận `CAS27` trong kho trùng khớp với mã đã audit ở phiên 27.*

## 1. Kết luận

**Đạt.** Ba mục làm đúng plan. Số liệu chạy lại được đều khớp, và ổn định.

- **UI-11:** đạt tiêu chí đóng. Mười lượt e2e liên tiếp trên Windows đạt trong lúc Project Owner dùng máy; công cụ kiểm thử phải mở lại cửa sổ 7 lần. Orchestrator xác nhận cơ chế mở lại cửa sổ chạy đúng trên Linux có trình quản lý cửa sổ thật (§3).
- **UI-13:** đóng phía mã. Còn một bước bấm tay của Project Owner.
- **UI-15:** đóng.
- **Hai phát hiện mới:**
  - một kiểm thử trong `npm run check` hỏng ngắt quãng trên Windows khi máy đang tải (UI-16, §5.1);
  - một spec e2e chưa được cơ chế mở lại cửa sổ che (UI-17, §5.2).

## 2. Phạm vi sửa

Liệt kê toàn bộ `UI/src` và `UI/tests` trên máy Project Owner: đúng 18 tệp có thời điểm ghi trong phiên, khớp `git status` của báo cáo.

- **UI-11:**
  - `tests/tools/window_guard.mjs` và `.d.mts` (mới);
  - `tests/e2e/walkthrough_harness.ts`: gắn cơ chế sau `firstWindow()`, ghi `window-restore.log`;
  - `tests/tools/ui11_probe.mjs`: thêm `--guard=on|off` và điều kiện `reminimized`.
- **UI-13:**
  - `send_reminder`: `configs.ts` thêm `leadTimeErrorPath`; `services.ts` thêm hàm thuần `dropLeadTimeErrors`; `routers.ts` chuyển tiếp hàm đó;
  - `use_reminder_settings.ts`: gọi hàm đó khi thêm hay bỏ dòng mốc;
  - kiểm thử: `services.test.ts`, `ReminderSettings.test.tsx`, `fake_logic.tsx`.
- **UI-15:**
  - `walkthrough_lib.mjs` và `.d.mts`;
  - `reminder_list_walkthrough.spec.ts`, `walkthrough.yaml`: chỉ chú thích;
  - `tests/e2e/reminder_seed_ticker.spec.ts` (mới).
- `main.tsx`, `navigation.ts`: **chỉ khối checkpoint** đổi. Orchestrator lọc diff: 0 dòng mã.

**Không đổi:** `Desktop/`, `Backend/`, `package.json`, `package-lock.json`, mọi trang khác. Chữ trên giao diện không đổi. Trong `UI/src` vẫn không có lời gọi nào tới `/reminders/checks`.

## 3. Những gì đã tự chạy lại

Môi trường: Linux, Node 24.14.1, Xvfb, Electron 44.4.5, `TZ=Asia/Ho_Chi_Minh`. **Mới ở phiên này:** chạy kèm trình quản lý cửa sổ icewm. Không có trình quản lý cửa sổ, lệnh thu nhỏ không có tác dụng dưới Xvfb. Thử twm trước: twm không hỗ trợ trạng thái thu nhỏ của chuẩn EWMH, nên `isMinimized()` vẫn `false`.

| Hạng mục | Báo cáo agent (Windows) | Orchestrator chạy lại (Linux) | Kết quả |
|---|---|---|---|
| `npm run check` | 1555 (hai lần cuối) | **1555/1555, hai lần**; `check_layer` không vi phạm | khớp |
| `main.test.tsx` lúc máy tải | 3/5 lần hết giờ 5 s | Không tái hiện: ca đầu 940 ms; chạy cả bộ kèm 3 tiến trình chiếm CPU trên máy 2 nhân: 1217 ms | §5.1 |
| Probe, điều kiện thu nhỏ, **tắt** cơ chế | 6/20 và 12/20 treo | Cửa sổ thật sự thu nhỏ (`minimized:true`) nhưng 0 lần treo: trên Linux, cửa sổ thu nhỏ vẫn vẽ khung hình | không tái hiện được cơ chế treo trên Linux (đã biết từ phiên 25) |
| Probe, **bật** cơ chế | 0/20 treo, 1 và 20 lần mở lại | `minimized` 10 lần chụp: 1 lần mở lại; `reminimized`: **10/10 lần mở lại**, cửa sổ ở trạng thái thường lúc chụp | cơ chế chạy đúng |
| `npm run e2e`, không runner, máy để yên | 10/10 lượt, 70 ca | **2/2 lượt, 70/70**, 0 lần mở lại | khớp |
| `npm run e2e`, có một vòng lặp thu nhỏ cửa sổ mỗi 9 s (đóng vai người dùng) | — | **2/2 lượt, 70/70**; 18 và 17 lần mở lại, rải trên 10 spec; 0 lần chụp ghi `minimized:true` | đạt |
| `UI/evidence` | không đổi | Băm 120 tệp trước và sau bốn lượt: giống hệt | đạt |
| Nhật ký chụp ảnh của lượt cuối trên máy Project Owner | 107 lần chụp, 0 lỗi | Đọc lại: 107 lần chụp, 0 lỗi, 0 `minimized:true`, lâu nhất 195 ms | khớp |
| Checkpoint | YAML hợp lệ, `UNSOLVED_PROBLEMS: []` | Parse ba khối: hợp lệ, không trùng id, `UNSOLVED_PROBLEMS: []` | đạt (§5.3) |
| Giờ trong checkpoint | — | `main` 22:33:18, `send_reminder` 22:34:16, `screens` 22:34:39; tệp ghi lúc 22:34:12, 22:34:39, 22:34:49 | đúng quy ước BE-8 |

**Phép cắn của Orchestrator** (trên bản sao, khôi phục sau mỗi lần):

| Làm hỏng | Kết quả |
|---|---|
| Hook không gọi `dropLeadTimeErrors` khi thêm hay bỏ dòng | 2 ca hỏng |
| `dropLeadTimeErrors` trả lại nguyên kết quả cũ | 1 ca hỏng |
| `dropLeadTimeErrors` bỏ **mọi** lỗi, kể cả lỗi của "Nhắc định kỳ" | 2 ca hỏng |
| `seedReminderSample` khẳng định trên kết quả lời gọi của chính nó (mã cũ) | `reminder_seed_ticker` hỏng: "check_due produced 0" |

Khôi phục xong: 230/230 kiểm thử D6, `reminder_seed_ticker` đạt. Bản sao giống hệt tệp trên máy Project Owner.

## 4. Đối chiếu với plan

- **UI-11:**
  - Cách làm đúng ứng viên của plan: trình nghe sự kiện `minimize` nằm trong tiến trình chính, phủ mọi thao tác chứ không chỉ lệnh chụp. Agent chọn cách này vì dữ liệu phiên 27 cho thấy cả `locator.click` cũng treo; lý do ghi ở `main-EXP-026`.
  - Có nguồn tài liệu: `electron.d.ts` của 44.4.5, kèm số dòng.
  - Chỉ gọi `restore()`. Không `focus()`, không `moveTop()`, không đổi kích thước. Không đổi `Desktop/`, không thêm cờ.
  - Cửa sổ đã thu nhỏ trước khi trình nghe được gắn thì được kiểm một lần lúc gắn: đúng.
  - Phép cắn trên Windows rõ ràng: tắt cơ chế thì 6/20 và 12/20 lần treo; bật thì 0/20.
  - Tiêu chí đóng của UI-11 đạt: 10 lượt liên tiếp, Project Owner dùng máy, 7 lần mở lại ở 4 trong 10 lượt.
- **UI-13:**
  - Quyết định "lỗi nào còn hiện" đặt ở Services (`dropLeadTimeErrors`). Hook chỉ gọi và giữ kết quả; trang không đổi. Đúng phân vai của iWCA.
  - Giá trị `deadline.lead_times` được đánh dấu `[CONTRACT]` trong Configs.
  - Kiểm thử viết trước khi sửa: hỏng trên mã cũ, đạt sau khi sửa.
- **UI-15:**
  - Công cụ vẫn gọi `check_due` một lần, rồi khẳng định trên `GET /reminders/pending` với đủ chi tiết của hai nhắc việc.
  - Ca tất định `reminder_seed_ticker` dùng một lời gọi `check_due` đặt trước, đóng vai ticker. Ca này chứng minh ticker giả đã nhận cả hai nhắc việc, và dữ liệu mẫu vẫn đạt.
  - Trường hợp ticker chỉ nhận nhắc việc hạn giao (gọi trước phút của tổng hợp) cũng được phủ theo logic: danh sách đang chờ vẫn có đủ cả hai.
- **Hai điểm lệch nhỏ** agent tự nêu, Orchestrator chấp nhận:
  - mốc e2e thành 70 vì thêm spec mới;
  - nhật ký ghi bước kết thúc bằng lần chụp sau lần mở lại, không phải đúng thời điểm.
- **Báo cáo lệch một chi tiết:** lời tường thuật giữa phiên ghi "8 lần mở lại", báo cáo cuối và checkpoint ghi 7, kèm phân bổ theo lượt. Lấy 7.

## 5. Phát hiện

### 5.1 `main.test.tsx` hỏng ngắt quãng trên Windows khi máy tải (trung bình) — UI-16

- **Ca:** "no bridge on the global object", ca đầu của tệp.
- **Triệu chứng:** "Test timed out in 5000ms", 3 trong 5 lần chạy `npm run check` lúc máy Project Owner đang tải. Chạy riêng thì đạt.
- **Nguyên nhân hợp lý nhất:** ca đầu là nơi nạp lần đầu toàn bộ `src/main.tsx` cùng mọi workflow, nên phải trả cả chi phí biến đổi mã. Chi phí này tăng theo mỗi workflow mới.
  - Trên Linux, ca này mất 0,9–1,2 s, kể cả khi máy tải. Trên Windows nó vượt 5 s; antivirus quét tệp có thể góp phần. Orchestrator không nắm chắc phần đóng góp của từng yếu tố.
- Agent đúng khi không nới thời gian chờ, và đã ghi vào NOTES của `main`.
- **Vì sao trung bình:** `npm run check` là cổng của mọi phiên giao diện; một cổng không tất định làm mọi số liệu sau này kém tin cậy.
- **Đề xuất cho phiên giao diện kế tiếp:**
  - tách chi phí nạp mã khỏi ca kiểm thử, ví dụ nạp trước cây mô-đun một lần trong `beforeAll`, để không ca nào phải trả chi phí đó trong giới hạn 5 s;
  - không nới thời gian chờ;
  - tiêu chí: `npm run check` 10 lần liên tiếp đạt trên Windows khi máy đang dùng bình thường.

### 5.2 `main_layout.spec.ts` chưa được cơ chế mở lại cửa sổ che (thấp) — UI-17

- Spec này tự mở Electron (`electron.launch`), không đi qua `launch()` của harness, nên không gắn trình nghe `minimize`.
- Nó chỉ chạy vài giây, và mười lượt của agent lẫn bốn lượt của Orchestrator đều không hỏng ở đây. Nhưng plan đòi phủ mọi thao tác.
- **Việc:** gắn cùng cơ chế sau `firstWindow()` của spec đó. Gộp vào phiên giao diện kế tiếp.

### 5.3 NOTES cũ trong checkpoint `screens` và `main` (thấp, dọn dẹp) — gộp vào UI-17

- `screens` còn ba NOTES đề xuất trạng thái hoặc sự cố quy trình của phiên 21 và 22. Các trang đó đã `hoàn_tất` từ lâu.
- `main` còn NOTE về `StageChange.test.tsx:183`, tức UI-12, đã đóng ở phiên 25.
- Chúng chưa quá hạn 14 ngày nhưng không còn đúng. Phiên giao diện kế tiếp chuyển nội dung còn giá trị sang EXPERIENCES và xóa phần còn lại, theo Giao thức 07.

### 5.4 `restore()` có thể kéo tiêu điểm về cửa sổ ứng dụng (ghi nhận)

- Trên Linux với icewm, sau mỗi lần mở lại, cửa sổ ở trạng thái `focused: true`: trình quản lý cửa sổ tự trao tiêu điểm khi mở lại. Mã không gọi `focus()`.
- Trên Windows, nếu điều này xảy ra, khi Project Owner thu nhỏ cửa sổ e2e thì nó bật lại và có thể lấy luôn bàn phím.
- Chỉ ảnh hưởng lúc e2e chạy, không ảnh hưởng ứng dụng thật. **Câu hỏi cho Project Owner:** trong phiên 28, cửa sổ bật lại có làm phiền việc anh đang gõ không?
- **Trả lời của Project Owner, 2026-10-04:** có; cửa sổ bật lại nhảy thẳng lên trên ứng dụng đang dùng. Mở UI-18 (trung bình): phím người vận hành gõ có thể rơi vào ứng dụng đang kiểm thử.

## 6. Trạng thái

- **UI-11:** đóng 2026-10-04, phiên 28.
- **UI-15:** đóng 2026-10-04, phiên 28.
- **UI-13:** đóng. Project Owner bấm tay ngày 2026-10-04: đúng.
- Không trang nào đổi trạng thái.
- Mở UI-16 (trung bình), UI-17 (thấp) và UI-18 (trung bình, sau câu trả lời ở §5.4), cho phiên giao diện kế tiếp. Không chặn phiên desktop 29 (DSK-17).

## 7. Commit

- **`CAS28 - UI: UI-11 window restore guard, UI-13, UI-15`:** 18 tệp ở §2. Không gồm `UI/test-results/`.
- **`OS - Audit session 28`:** bản audit này, `open_issues.md`, `v1_roadmap.md`, `CLAUDE.md`.
