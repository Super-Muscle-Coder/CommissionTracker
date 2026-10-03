# AUDIT — PHIÊN 27 (LAYER GIAO DIỆN: D6 NHẮC VIỆC, UI-11 BƯỚC 3, XEM LẠI Ô NGÀY)

*Orchestrator, 2026-10-03. Đối chiếu với `.plan/ui_plan.md` (plan phiên 27), `.design/ui_decomposition.md` (mục "Chặng D6", §5, §7), Data Schema 9.0.2 (`send_reminder`, `types.reminder_settings_record`, `types.reminder_notification_record`), API Contract 4.0.0 (`send_reminder`, `cross_cutting.reminder_ticker`), `.plan/open_issues.md` (UI-11), skill `iwca-implementation`, và bốn khối checkpoint `send_reminder`, `kit`, `screens`, `main`. Định danh phiên của agent: `coding-agent@2026-10-03#1`. Mốc so sánh: commit `af3769c`. Orchestrator đã xác nhận `CAS26` và `OS - Audit session 26` đã có trong kho.*

## 1. Kết luận

**Đạt.** D6 phía giao diện làm đúng đặc tả; mọi số liệu chạy lại được đều khớp, và ổn định.

- **`reminder_list`, `reminder_settings`:** đúng đặc tả D6. Đề xuất giữ `đang_làm` cho tới khi Project Owner chạy tay hai kịch bản, rồi chuyển `hoàn_tất` (§6).
- **UI-11 bước (3):** dữ liệu đủ để kết luận cơ chế. Cả 7 lần hết giờ chụp ảnh đều xảy ra khi cửa sổ **đang bị thu nhỏ**; không lần nào ở cửa sổ bình thường. Nguồn của việc thu nhỏ chưa rõ. Bước (4) cần Project Owner quyết (§5.1).
- **Việc 7 (ô ngày):** ngày đúng dạng ngày/tháng/năm. Nhưng **ô giờ** trên Windows hiện kiểu 12 giờ có SA/CH. Agent báo cho ô ngày giờ của `payment_form`, nhưng bỏ sót ô "Vào lúc" của chính trang D6 mới làm (§5.2).
- Một lỗi nhỏ mới: lỗi "trùng mốc" nhảy sang dòng khác sau khi bấm "Bỏ mốc này" (§5.3). Không chặn.

## 2. Phạm vi sửa

Liệt kê toàn bộ `UI/src`, `UI/tests`, `UI/scripts` trên máy Project Owner. Chỉ các tệp sau có thời điểm ghi trong phiên; khớp `git status` của báo cáo.

**Mã mới:**
- Workflow `send_reminder`: `configs.ts`, `entities.ts`, `adapters.ts`, `services.ts`, `routers.ts`, ba tệp kiểm thử.
- Kit: `CheckboxField`, `TimeField`.
- Trang `reminder_list`, `reminder_settings`: component, hook, `walkthrough.yaml`, kiểm thử dựng trang.
- `tests/e2e/reminder_list_walkthrough.spec.ts`, `reminder_settings_walkthrough.spec.ts`.

**Tệp sửa:**
- `main.tsx`: ráp nối `send_reminder` và khối checkpoint.
- `kit/index.ts`: hai dòng export và checkpoint.
- `screens/navigation.ts`: hai trang, mục điều hướng thứ năm, checkpoint.
- `logic_context.ts`: thêm `sendReminder`.
- `fake_logic.tsx`, `app_root.test.tsx`: fake và ca kiểm thử.
- `commission_list_walkthrough.spec.ts`, `progress_board_walkthrough.spec.ts`: chỉ thêm `['Nhắc việc', null]` vào danh sách mục điều hướng.
- `main_layout.spec.ts`: chụp qua `timedScreenshot`.
- `walkthrough_harness.ts`: ghi trạng thái cửa sổ (UI-11).
- `walkthrough_lib.mjs`, `.d.mts`, `walkthrough_app.mjs`: `seedReminderSample`, cờ `--reminders`.
- `check_contrast.mjs`: phủ `TimeField`, vòng focus của `CheckboxField`.
- `UI/evidence/`: chụp lại toàn bộ (120 tệp), có thêm hai thư mục D6.

**Không đổi:** `package.json`, `package-lock.json`, Configs của workflow khác, `Desktop/`, `Backend/`. `Desktop/src/main.ts` giữ thời điểm ghi của phiên 26.

**Tìm trong `UI/src`:** không có lời gọi nào tới `/reminders/checks`. Chuỗi này chỉ xuất hiện trong chú thích. Không có `eslint-disable`, `@ts-ignore`, `stylelint-disable` mới.

## 3. Những gì đã tự chạy lại

Môi trường: Linux, Node 24.14.1, Xvfb, Electron 44.4.5, `TZ=Asia/Ho_Chi_Minh` (§5.6).

| Hạng mục | Báo cáo agent (Windows) | Orchestrator chạy lại (Linux) | Kết quả |
|---|---|---|---|
| `npm run check` | 1550 (35 tệp), `check_layer` 167 tệp | **1550/1550, hai lần**; `check_contrast` 19 cặp chữ và 13 cặp phi văn bản đạt; `check_layer` 167 tệp, không vi phạm; `lint:e2e` sạch | khớp |
| Kiểm thử `send_reminder` | 198 | nằm trong 1550; ba suite D6 (logic và hai trang) = 246 | khớp |
| `reminder_list_walkthrough.spec` chạy riêng | 10/10 | **10/10** (mỗi lần ~59 s, phần lớn là chờ nhắc việc tổng hợp) | khớp |
| `reminder_settings_walkthrough.spec` chạy riêng | 10/10 | **10/10** | khớp |
| `npm run e2e`, có runner | 69 ca; 5 đạt, 1 hỏng (hết giờ chụp) | **3/3, mỗi lần 69/69** | khớp |
| `npm run e2e`, không runner | 3 lần đều hỏng vì UI-11, `UI/evidence` nguyên vẹn | **69/69**; băm 120 tệp `UI/evidence` trước và sau: giống hệt | đạt |
| Nhật ký chụp ảnh (Linux) | — | 555 lần chụp, lâu nhất 105 ms, `minimized:true` 0 lần | như mọi phiên trước |
| Checkpoint | YAML hợp lệ, `UNSOLVED_PROBLEMS: []` | Parse bốn khối: hợp lệ, không trùng id, `UNSOLVED_PROBLEMS: []` | đạt |
| Giờ trong checkpoint | — | Cả bốn: `2026-10-03T10:42:22.0487385+07:00`; tệp ghi lúc 10:42:22 | **đúng** quy ước BE-8 |

**Phép cắn của Orchestrator** (trên bản sao, khôi phục sau mỗi lần; khôi phục xong: 246/246):

| Làm hỏng | Kết quả |
|---|---|
| Gửi `weekday` cả khi đơn vị là "ngày" | 1 ca hỏng |
| Bỏ giới hạn 365 ngày / 8760 giờ | 2 ca hỏng |
| Không kiểm "Mỗi" khi nhắc định kỳ đang tắt | 1 ca hỏng |
| Nút "Đã xem" không bị vô hiệu trong lúc gửi | 1 ca hỏng |
| "Vào thứ" luôn hiện | 2 ca hỏng |
| Cho bỏ dòng mốc cuối cùng | 1 ca hỏng |
| Không đọc lại danh sách sau "Đã xem" thành công | 4 ca hỏng |

Cộng hai phép cắn của agent (bỏ luật mốc trùng, luôn thêm "1 ngày"). Mọi quyết định chính của D6 đều có kiểm thử giữ.

**Lần chạy cuối của agent có trước lần sửa cuối.** Bốn tệp mang checkpoint (`main.tsx`, `kit/index.ts`, `navigation.ts`, `services.ts`) ghi lúc 10:42, sau lượt e2e cuối lúc 10:37. Mọi số liệu Orchestrator chạy lại đều trên mã cuối cùng, nên không ảnh hưởng.

## 4. Đối chiếu với đặc tả D6

**Lời gọi:**
- Bốn lời gọi, bảng nhãn khớp API Contract 4.0.0 từng dòng.
- Configs ghi Data Schema 9.0.2 và API Contract 4.0.0.
- Không có `check_due`. Chỉ công cụ kiểm thử (`seedReminderSample`) gọi `POST /reminders/checks`.

**Luật kiểm form** (`routers.ts`) là bản sao `reminder_settings_record`:
- `every` ≥ 1, đọc trên chuỗi chữ số, không qua số thực;
- `at_time` dạng HH:MM, 00:00–23:59;
- `weekday` 1..7, bắt buộc khi đơn vị "tuần"; gửi `null` khi đơn vị "ngày", bất kể bản nháp còn giữ thứ;
- mỗi mốc tối đa 365 ngày / 8760 giờ; hai mốc cùng độ dài (1 ngày = 24 giờ) thì lỗi ở mốc sau;
- kiểm cả phần đang tắt.

**Trình bày:**
- Đúng dòng chính và dòng phụ của hai loại nhắc việc.
- Thứ tự giữ nguyên như hợp đồng.
- "Sớm nhất" lấy phần tử đầu của `upcoming`.
- Ngày giờ `HH:mm dd/mm/yyyy`; ngày cắt từ chuỗi.
- "Đã xem" không hỏi xác nhận, và mọi nút "Đã xem" bị vô hiệu trong lúc gửi.

**Ảnh bằng chứng** (xem cả 11 ảnh D6, cùng ảnh `commission_form`, `payment_form`, `income_report`):
- **Danh sách:** hai nhắc việc đúng thứ tự: hạn giao "Tranh hạn hôm nay", đến hạn 00:00 03/10/2026; rồi tổng hợp "3 đơn đang mở · 2 đơn có hạn giao · sớm nhất: Minh họa bìa sách (01/01/2026)".
- "Đã xem" ra thông báo; trạng thái rỗng có nút "Cài đặt nhắc việc".
- **Cài đặt:**
  - mặc định "Chưa lưu lần nào";
  - sau khi lưu, "Lưu lần cuối lúc 10:20 03/10/2026" và đúng giá trị: mỗi 2 tuần, 08:15, Thứ Năm, hai mốc;
  - đổi đơn vị sang "ngày" thì "Vào thứ" biến mất;
  - lỗi 366 ngày hiện dưới ô số, con trỏ ở ô đó.
- Hàng nút nằm ngay dưới tiêu đề; mục "Nhắc việc" đứng cuối thanh điều hướng.

**Năm chỗ agent tự quyết, Orchestrator chấp nhận cả năm, ghi vào `ui_decomposition.md`:**
1. **"Thêm mốc nhắc":** dòng mới là "1 ngày" nếu chưa có mốc nào dài đúng 24 giờ; nếu đã có thì ô số để trống, đơn vị "ngày". Cách hiểu này tốt hơn câu đặc tả, vì tránh tự tạo ra một mốc trùng.
2. **Mã lỗi của mốc:**
   - mốc ≤ 0 báo "Nhập một số nguyên từ 1 trở lên";
   - quá 365 ngày có câu riêng;
   - mốc trùng có khóa theo cả dòng, hiện dưới ô số.
3. **Mốc để trống:** "Nhập thời gian nhắc trước".
4. **Vị trí dòng chữ cố định của `reminder_list`:** đặt dưới hàng nút (đặc tả ghi "dưới tiêu đề"). Đúng nguyên tắc 7: hàng nút ngay dưới tiêu đề.
5. **"Đã xem" gặp 500:** trang lặng lẽ đọc lại danh sách (đặc tả ghi "danh sách giữ nguyên"). Nếu lần đọc lại cũng hỏng thì danh sách cũ vẫn giữ. Vô hại.

**Ghi nhận nhỏ, không phải lỗi:**
- Việc hiện hay ẩn "Vào thứ" được so ở trang (`draft.periodicUnit === view.weekdayUnit`), với giá trị lấy từ view. Chặt hơn thì view mang sẵn một cờ. Không vá.

**Báo cáo lệch hai chi tiết nhỏ:**
- Routers có **ba** hàm thuần (`changePeriodicUnit`, `addLeadTime`, `removeLeadTime`), không phải hai.
- `ui11_traces` có **10** thư mục, không phải 11.

## 5. Phát hiện

### 5.1 UI-11: cơ chế đã rõ, nguồn của việc thu nhỏ chưa rõ (trung bình; quyết định của Project Owner)

**Dữ liệu phiên 27** (agent gộp 29 lượt; Orchestrator đọc lại nhật ký của lượt cuối trên máy Project Owner):
- 1119 lần chụp có trạng thái cửa sổ, trong đó 7 lần hết giờ 30 s.
- **Cả 7 lần**, trạng thái đọc ngay trước lệnh chụp là `minimized:true, visible:false`.
- Không lần hết giờ nào ở cửa sổ bình thường.
- Khớp thí nghiệm phiên 25 (thu nhỏ: 11/20 treo; bị che hoặc mất tiêu điểm: 0/20).

**Hình dạng trong nhật ký lượt cuối** (`norunner3`):
- Cửa sổ bị thu nhỏ ở `commission_form` (ngay sau khi mở), `commission_list` (từ bước S3), `progress_board` (từ bước S4).
- Các spec ở giữa vẫn bình thường.
- Mỗi spec mở một cửa sổ Electron **mới**. Vậy có thứ gì đó thu nhỏ cửa sổ nhiều lần, rải rác, không theo một bước cố định.
- Tìm trong mã: harness, công cụ, desktop Main không có lệnh nào thu nhỏ cửa sổ. Fixture backend không mở cửa sổ console mới.
- Giả thuyết phù hợp nhất: **người dùng máy** hoặc Windows (Win+D, bấm thu nhỏ khi một cửa sổ mới bật lên). Lượt chạy rơi vào 10:16–10:38 sáng nay.
- Agent khẳng định không thu nhỏ cửa sổ nào. Vậy quy ước "không thu nhỏ khi e2e chạy" đã không đủ, dù không ai cố ý vi phạm.

**Câu hỏi cho Project Owner:** trong khoảng 10:15–10:40 sáng nay, anh có dùng máy và thu nhỏ cửa sổ, hay dùng "Show desktop" không?

**Bước (4), Project Owner quyết:**
- **A (Orchestrator khuyến nghị):** harness kiểm trước mỗi lần chụp. Nếu cửa sổ đang thu nhỏ thì gọi `restore()`, ghi một dòng `restored` vào nhật ký, rồi chụp.
  - Chỉ ở công cụ kiểm thử; ứng dụng thật không đổi.
  - Không che lỗi sản phẩm: ứng dụng thật không chụp ảnh, và thu nhỏ không làm ứng dụng hỏng (phiên 25 đã chứng minh; Project Owner cũng xác nhận ngày 2026-10-02).
  - Tiêu chí đóng UI-11: 10 lượt e2e liên tiếp trên Windows không hết giờ chụp ảnh. Nhật ký vẫn cho biết bao nhiêu lần phải `restore()`.
- **B:** chỉ giữ quy ước. Dữ liệu phiên này cho thấy cách này không giữ được e2e tất định khi máy đang có người dùng.

### 5.2 Ô giờ hiện kiểu 12 giờ có SA/CH trên Windows (thấp; cần Project Owner trả lời một câu) — UI-14

- **Trên Windows (ảnh của agent):** ô "Vào lúc" của `reminder_settings` hiện `09:00 SA` và `08:15 SA`. Ô ngày giờ của `payment_form` hiện `03/10/2026 10:38 SA`. Agent chỉ báo ô `payment_form`.
- **Trên Linux, cùng bản build, cùng `--lang=vi`:** ô "Vào lúc" hiện `08:15`, kiểu 24 giờ (ảnh nháp của Orchestrator).
- Vậy kiểu 12 giờ đến từ phía Windows, nhiều khả năng là định dạng giờ trong cài đặt vùng (Region) của máy, không đến từ mã giao diện.
- Giá trị lưu vẫn là `HH:MM`, nên dữ liệu đúng. Chỉ khác cách hiện so với chữ giờ 24 giờ ở các chỗ khác, ví dụ "Lưu lần cuối lúc 10:20".
- Orchestrator không nắm chắc Chromium trên Windows lấy định dạng giờ từ đâu.
- **Câu hỏi cho Project Owner:** trong Windows Settings → Time & language → Language & region → Regional format, giờ ngắn (Short time) của máy đang là 12 giờ hay 24 giờ?
- **Đề xuất:** V1 chấp nhận, vì ô gốc theo cài đặt của chính người dùng. Nếu muốn đồng nhất, V2 thay bằng hai ô chọn giờ và phút. Ghi UI-14.

### 5.3 Lỗi "trùng mốc" nhảy sang dòng khác sau "Bỏ mốc này" (thấp) — UI-13

- Lỗi của form gắn theo vị trí dòng (`deadline.lead_times.<i>`) và giữ tới lần lưu kế tiếp.
- **Tái hiện bằng kiểm thử dựng trang tạm, đã xóa:**
  1. ba dòng [1 ngày, 24 giờ, 5 ngày];
  2. lưu → lỗi "trùng" ở dòng 2;
  3. bỏ dòng 1 → còn [24 giờ, 5 ngày], hết trùng;
  4. kết quả: câu "Mốc nhắc này trùng với một mốc khác" hiện dưới dòng "5 ngày".
- Hết khi bấm lưu lại. Không mất dữ liệu, không gửi sai.
- **Sửa ở phiên giao diện kế tiếp** (nhỏ): khi thêm hoặc bỏ dòng mốc thì bỏ các lỗi đang gắn với dòng mốc. Không chặn Project Owner chạy tay.

### 5.4 Dòng chữ "Nhắc việc đến hạn sẽ hiện thành thông báo của Windows" chỉ đúng khi có DSK-17 (ghi nhận)

- Câu này do đặc tả của Orchestrator quy định.
- Trước khi có `reminder_ticker` (DSK-17), trong dùng thật danh sách luôn rỗng và không có thông báo nào.
- Chặng D6 chỉ xong khi cả hai phần xong. Khi chạy tay, Project Owner dùng `--reminders` để có dữ liệu (lệnh ở §7).

### 5.5 `npm audit` báo lỗ hổng mới, chỉ ở công cụ phát triển (thấp) — ENV-7

- **UI:** 5 lỗ hổng mức high, cùng một chuỗi `stylelint → globby → fast-glob → micromatch → braces` (GHSA-vfj7-8cjw-p6xm).
- **Desktop:** 8 lỗ hổng mức high (ví dụ `http-cache-semantics`, GHSA-ch52-4w7c-c8xp).
- `npm audit --omit=dev` ở cả hai layer: **0**.
- `package-lock.json` không đổi: đây là cảnh báo mới được công bố, không phải phụ thuộc mới.
- Không chạy `npm audit fix --force`, vì nó đổi phiên bản phá vỡ, ví dụ hạ `stylelint`.
- Rà lại trước chặng G.

### 5.6 Môi trường của Orchestrator: lệch múi giờ (ghi nhận, không phải lỗi sản phẩm)

- Hai lần chạy đầu `reminder_list` của Orchestrator hỏng.
- Nguyên nhân: Node đọc `TZ=Asia/Saigon` bằng ICU, còn Python của máy kiểm không có tệp múi giờ đó nên dùng UTC. Mốc phút của nhắc việc tổng hợp vì vậy lệch 7 giờ.
- Đặt `TZ=Asia/Ho_Chi_Minh` thì đạt 10/10.
- Trên Windows, công cụ và backend dùng chung một đồng hồ, nên không gặp.

### 5.7 Tiêu chí e2e của phiên

- Plan cho phép không tính lần hỏng chỉ vì hết giờ chụp ảnh.
- **Có runner:** lượt 1 và lượt 3–6 đạt, tức 5 lượt đạt; lượt 2 hỏng vì UI-11. Đạt theo luật đó.
- **Không runner:** tiêu chí là `UI/evidence` nguyên vẹn. Ba lượt của agent đều nguyên vẹn; Orchestrator có thêm một lượt đạt trọn 69/69.
- **Chấp nhận.**

## 6. Trạng thái trang

`reminder_list`, `reminder_settings`: giữ **`đang_làm`**. Chuyển `hoàn_tất` khi Project Owner chạy tay hai kịch bản (§7) mà không thấy vấn đề. UI-13 và UI-14 không chặn việc này.

## 7. Việc của Project Owner

1. Trả lời hai câu: §5.1 (có thu nhỏ cửa sổ sáng nay không; chọn A hay B) và §5.2 (định dạng giờ ngắn của Windows).
2. Chạy tay theo các bước trong báo cáo của agent:
   - `npm run walkthrough:app -- --reminders`: danh sách hai nhắc việc, bấm dòng chính, "Đã xem";
   - `npm run walkthrough:app -- --empty`: cài đặt mặc định, lưu, mở lại, đổi đơn vị, nhập lỗi.

## 8. Commit

- **`CAS27 - UI: D6 reminders (reminder_list, reminder_settings), UI-11 window state`:**
  - mọi tệp ở §2 trong `UI/src`, `UI/tests`, `UI/scripts`;
  - `UI/evidence/`;
  - không gồm `UI/test-results/`.
- **`OS - Audit session 27`:** các tệp Orchestrator, gồm bản audit này, `open_issues.md`, `ui_decomposition.md`, `v1_roadmap.md`, `CLAUDE.md`.
