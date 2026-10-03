# AUDIT — PHIÊN 26 (LAYER DESKTOP: DSK-15, DSK-13, DSK-14, DSK-12)

*Orchestrator, 2026-10-02. Đối chiếu với `.plan/desktop_plan.md` (plan phiên 26), `.plan/open_issues.md`, Data Schema 9.0.2 (`clause_a_common.mandatory_rules`, `shared_values`, `clause_d_desktop`), và khối checkpoint ở đầu `Desktop/src/main.ts`. Định danh phiên của agent: `coding-agent@2026-10-02#1`. Mốc so sánh: commit `66cfde8`.*

## 1. Kết luận

**Đạt.** Bốn mục làm đúng plan. Phần chạy lại được trên Linux khớp với báo cáo, và phép cắn có hiệu lực.

- **DSK-15:** đóng. Ô ngày hiện ngày/tháng/năm trên cả bản mã nguồn lẫn bản đóng gói.
- **DSK-13:** đóng.
- **DSK-12:** đóng.
- **DSK-14:** đóng phần mã. Phần "không có cảnh báo AVG mới" chờ Project Owner xem lịch sử cảnh báo (§5.1).

Agent sửa một dòng ngoài plan trong `packaged_app.spec.ts`. Orchestrator **chấp nhận**: dòng đó sai từ phiên giao diện 16, và chỉ lộ ra vì từ phiên 14 chưa ai chạy `test:packaged` (§5.2).

## 2. Phạm vi sửa

Liệt kê toàn bộ `Desktop/` trên máy Project Owner, bỏ qua `node_modules`, `release`, `packaging/stage`, `dist`. Chỉ các tệp sau có thời điểm ghi trong phiên, khớp `git status` của báo cáo:

- `configs/desktop.json`:
  - `app.locale: "vi"`;
  - `main.error_dialog` với ba chuỗi: câu "không khởi động được", câu "đang chạy thì dừng", nhãn "Chi tiết kỹ thuật:".
- `src/main.ts`, phần mã:
  - `app.commandLine.appendSwitch('lang', config.app.locale)` ở dòng 1429, trước `requestSingleInstanceLock` (1442) và `whenReady` (1615);
  - hàm thuần `buildErrorDialog`;
  - `fatal(message, phase)`, mặc định `'startup'`; chỉ `onUnexpectedExit` truyền `'running'`;
  - khi có `--ct-test-no-dialog` thì ghi dòng `error dialog text: <JSON>`.

  Chữ của dòng `FATAL:` không đổi. Phần còn lại của diff là khối checkpoint.
- `tests/desktop_main.spec.ts`: ba ca mới, 12 tới 14.
- `tests/packaged/measure_startup.cjs`: ghi script ra `.ps1` tạm, chạy bằng `-File`, xóa thư mục tạm khi xong. Không còn `-EncodedCommand`, không dùng `-ExecutionPolicy`.
- `tests/packaged/packaged_app.spec.ts`: một dòng chờ chữ (§5.2).
- `evidence/dsk15/` (8 ảnh), `evidence/dsk13/` (1 ảnh): thư mục mới.

Mọi tệp khác của `Desktop/` giống hệt bản đã commit. Không đổi preload, bridge, cách dừng backend, thứ tự khởi động, `ui_origin`.

## 3. Những gì đã tự chạy lại

Môi trường: Linux, Node 24, Xvfb, Electron 44.4.5. Trên Linux, các ca dùng PowerShell của `tests/helpers.ts` luôn hỏng (đã biết từ các phiên trước).

| Hạng mục | Báo cáo agent (Windows) | Orchestrator chạy lại (Linux) | Kết quả |
|---|---|---|---|
| `npm run lint`, `tsc` | sạch | sạch | khớp |
| `npm test` | 17/17 | 8 đạt, 9 hỏng: 7 ca cũ hỏng vì PowerShell như trước, cộng ca 12 và 14 (xem dưới) | phù hợp với giới hạn Linux |
| Ca 13 (hộp thoại lúc khởi động) | đạt | phần khẳng định nội dung đạt; chạy riêng thì hook PowerShell hỏng | đạt phần kiểm được |
| Ca 14 (hộp thoại khi đang chạy) | đạt | dòng `error dialog text:` in ra đúng câu "gặp lỗi khi đang chạy"; ca hỏng ở hook PowerShell | đạt phần kiểm được |
| Ca 12 (ngôn ngữ) | đạt | `getLocale()` và `navigator.language` là `vi`; riêng `Intl…resolvedOptions().locale` của trang vẫn `en-US` trên Linux | §5.4 |
| Cắn DSK-15: bỏ dòng `appendSwitch` | ca 12 hỏng (`en-US`) | `getLocale()` = `en-US`, `navigator.language` = `en-US` | đạt |
| Cắn DSK-13: đảo thứ tự câu và chi tiết | mutation (a), (b) | ca 13 hỏng ở đúng khẳng định nội dung | đạt |
| UI `npm run e2e` với Main mới | 59/59 | **59/59, hai lần**; băm `UI/evidence` trước và sau: giống hệt | khớp |
| Ảnh DSK-15 | trước/sau, mã nguồn và đóng gói | Xem cả 8 ảnh: trước `11/30/2026`, `10/01/2026`; sau `30/11/2026`, `01/10/2026`; số liệu trang Thu nhập khớp audit phiên 24 | đúng |
| Ảnh DSK-13 | hộp thoại thật | Một hộp thoại: câu tiếng Việt, dòng trống, "Chi tiết kỹ thuật:", thông điệp tiếng Anh. Không có nội dung nào khác của màn hình | đúng |
| Checkpoint Main | YAML hợp lệ, `UNSOLVED_PROBLEMS: []` | Parse lại: 23 EXPERIENCES, không trùng id, `UNSOLVED_PROBLEMS: []`; `main-EXP-019` có `derived_from: main-PROB-001`; không còn chữ "V2" | đạt |
| Giờ trong checkpoint | — | `last_updated_at` 16:26:47.62; tệp ghi lúc 16:27:03 | **đúng** (lần đầu đúng quy ước BE-8) |

`npm run dist`, `test:packaged` và `measure_startup.cjs` chỉ chạy được trên Windows; Orchestrator dựa vào số liệu của agent cùng 4 ảnh bản đóng gói.

## 4. Đối chiếu với plan

- **DSK-15:**
  - giá trị lấy từ config;
  - nguồn tài liệu là `electron.d.ts` của 44.4.5, mục `app.getLocale()`;
  - có kiểm thử tự động và phép cắn;
  - ảnh "trước" của bản đóng gói được dựng bằng cách tạm đặt `en-US` rồi khôi phục `vi`: hợp lý, vì bản đóng gói cũ đã bị dựng lại.
- **DSK-13:**
  - câu chữ trong config, có hai trường hợp;
  - chi tiết kỹ thuật ở dòng sau; dòng `FATAL:` không đổi;
  - kiểm được không cần bấm, có ảnh thật.
  - Agent đổi "gửi tệp nhật ký" thành "gửi nội dung chi tiết bên dưới", vì ứng dụng không ghi tệp nhật ký nào. **Đúng; câu mẫu của Orchestrator sai** ở điểm này.
- **DSK-14:** đúng cách thứ nhất của plan. Tệp `.ps1` có BOM để PowerShell 5.1 đọc đúng UTF-8.
- **DSK-12:** đúng việc 5.
  - NOTE "Cách làm của phiên 13" được xóa; lý do ghi ở `main-EXP-023`.
  - EXPERIENCES và EVIDENCE cho cả bốn mục.

## 5. Phát hiện

### 5.1 DSK-14 — cần Project Owner xem lịch sử cảnh báo AVG

Agent không đọc được lịch sử cảnh báo của AVG. **Việc của Project Owner:** mở AVG → lịch sử cảnh báo, xem có mục nào mới quanh **16:09 và 16:22 ngày 2026-10-02** không. Không có thì DSK-14 đóng hẳn. Có thì chụp ảnh gửi Orchestrator.

### 5.2 `test:packaged` hỏng từ phiên 16 mà không ai biết (trung bình, quy trình) — DSK-16

`packaged_app.spec.ts` chờ câu "Chưa có khách hàng nào đang hoạt động.". Từ phiên giao diện 16, `client_list` với cơ sở dữ liệu trống hiện "Chưa có khách hàng nào." (câu cũ chỉ còn là chữ của nhóm "đang hoạt động" khi mọi khách đã lưu trữ). Chỉ phiên desktop mới chạy `test:packaged`, và phiên desktop gần nhất là phiên 14, nên bộ kiểm thử bản đóng gói đã sai suốt 11 phiên.

Sửa của agent đúng (`exact: true`, chú thích nói rõ nguồn gốc). Rủi ro là ở quy trình: một thay đổi chữ ở giao diện làm hỏng kiểm thử của layer khác mà không ai thấy. **Đề xuất:**
- mọi phiên desktop chạy `test:packaged` (đã có);
- trước chặng G (phát hành), Orchestrator thêm `test:packaged` vào tiêu chí;
- plan giao diện nào đổi chữ của `client_list` (trang mở đầu) phải chạy `test:packaged`.

Ghi thành DSK-16 ở `open_issues`.

### 5.3 Tiêu đề cửa sổ hộp thoại lỗi là "Error" (thấp, V2)

`dialog.showErrorBox` trên Windows luôn đặt tiêu đề cửa sổ là "Error"; chữ "Commission Tracker" nằm ở dòng đầu nội dung. Đổi được bằng `dialog.showMessageBox`, nhưng ngoài DSK-13. Để V2; ghi vào UI-6 (phần V2) vì đây là trải nghiệm dùng.

### 5.4 Ca 12 phụ thuộc nền tảng ở một khẳng định (thấp, ghi nhận)

Trên Linux, `--lang` đổi `getLocale()` và `navigator.language` nhưng không đổi locale mặc định của `Intl` trong trang (vẫn `en-US`); trên Windows cả ba đổi. Không ảnh hưởng sản phẩm: giao diện luôn gọi `Intl` với `'vi-VN'` viết rõ, và Windows là nền tảng duy nhất của V1. Nếu sau này có bản Linux, khẳng định `intlLocale` cần xem lại.

### 5.5 "Đang chạy" bao gồm cả khoảng giữa READY và lúc cửa sổ nạp xong (thấp, ghi nhận)

`onUnexpectedExit` luôn chọn câu "gặp lỗi khi đang chạy". Nếu backend chết sau READY nhưng trước khi cửa sổ hiện, người dùng sẽ đọc câu "đang chạy" dù chưa thấy ứng dụng. Hiếm, và cả hai câu đều dẫn tới cùng một việc phải làm. Không vá ở V1.

### 5.6 Báo cáo sai một chi tiết nhỏ

Agent viết `%APPDATA%\CommissionTracker\data.db` "giờ đã tồn tại, khác với NOT-EXISTS ở các phiên trước". Thực ra tệp đã có từ 2026-09-28 (mốc của phiên 22–25 đều ghi 114688 B, SHA `B1996554…F390B`). Không ảnh hưởng; mốc đầu và cuối phiên vẫn giống nhau.

### 5.7 Lần chạy `test:packaged` cuối là trước lần sửa checkpoint cuối

Agent tự nêu điểm này. Phần đổi chỉ là chú thích, nhưng làm đổi `dist/main.js`. Orchestrator đã chạy lại lint, `tsc`, các ca liên quan và e2e trên mã cuối. Chấp nhận.

## 6. Ảnh hưởng tới giao diện

Ảnh bằng chứng có ô ngày trong `UI/evidence` (D2 `commission_form`, D4 `payment_form` ô ngày giờ, D5 `income_report`) nay hiện kiểu cũ so với ứng dụng thật. Phiên giao diện kế tiếp chạy lại các kịch bản có `CT_WALKTHROUGH_RUNNER` để làm mới. Đã ghi ở `ui_decomposition.md`.

Lưu ý thêm: ô ngày giờ `datetime-local` của `payment_form` cũng sẽ theo `vi`. Agent chưa chụp ô này; phiên giao diện kế tiếp xem lại ảnh `payment_form`.

## 7. Commit

`CAS26`, gồm năm tệp mã/cấu hình/kiểm thử ở §2 và thư mục `Desktop/evidence/`. Không gồm `Desktop/test-results/`.
