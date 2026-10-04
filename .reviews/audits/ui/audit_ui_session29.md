# AUDIT — PHIÊN 29 (LAYER GIAO DIỆN, VÁ NGẮN: UI-18, UI-16, UI-17)

*Orchestrator, 2026-10-04. Đối chiếu với `.plan/ui_plan.md` (plan phiên 29), `.plan/open_issues.md` (UI-16, UI-17, UI-18), Giao thức 07, và hai khối checkpoint `main`, `screens`. Định danh phiên của agent: `coding-agent@2026-10-04#1`. Mốc so sánh: commit `41cd157`. Orchestrator đã xác nhận `CAS28` trong kho trùng khớp với mã đã audit ở phiên 28.*

## 1. Kết luận

**Đạt phần làm được trong `UI/`.** Mọi số liệu chạy lại được đều khớp, và ổn định.

- **UI-16:** đóng.
- **UI-17:** đóng.
- **UI-18:** đóng **một nửa**. Khi công cụ kiểm thử mở lại cửa sổ bị thu nhỏ, cửa sổ không còn giành tiêu điểm. Nhưng Project Owner vẫn bị giành tiêu điểm trong 10 lượt e2e. Agent đo được nguồn chính là **lúc ứng dụng khởi động**: mỗi spec mở một cửa sổ mới, và cửa sổ mới hiện ra kích hoạt.
  - Cách chữa nằm ở `Desktop/`, ngoài phạm vi plan. Agent dừng đúng chỗ.
  - **Đây là chỗ hở trong đặc tả UI-18 của Orchestrator:** tôi quy hết việc giành tiêu điểm cho `restore()`, mà không tính tới việc mỗi spec khởi động một cửa sổ mới.
- **Một phát hiện mới:** một ca trong `app_root.test.tsx` hỏng ngắt quãng (UI-19, thấp; §5.3).

## 2. Phạm vi sửa

Liệt kê toàn bộ `UI/src`, `UI/tests` và `Desktop/src` trên máy Project Owner. Chỉ các tệp sau có thời điểm ghi trong phiên, khớp `git status` của báo cáo:

- `tests/tools/window_guard.mjs` và `.d.mts`: `showInactive()` thay cho `restore()`; mỗi lần mở lại ghi thêm cách đã dùng và tiêu điểm sau đó.
- `tests/e2e/walkthrough_harness.ts`: dòng nhật ký mở lại có thêm `way=` và `focused_after=`.
- `tests/e2e/main_layout.spec.ts`: gọi `installRestoreGuard` sau `firstWindow()`.
- `tests/main/main.test.tsx`: thêm `beforeAll` nạp trước `src/main` một lần, giới hạn riêng 60 s.
- `tests/tools/ui18_probe.mjs` (mới): công cụ đo bốn cách mở lại cửa sổ.
- `tests/tools/ui18_launch_probe.mjs` (mới): công cụ đo tiêu điểm lúc khởi động, làm sau câu trả lời của Project Owner.
- `src/main.tsx`, `src/screens/navigation.ts`: **chỉ khối checkpoint**. Orchestrator lọc diff: 0 dòng mã.

**Không đổi:** `Desktop/` (`main.ts` giữ thời điểm ghi của phiên 26), `Backend/`, mọi tệp khác của `UI/src`, `package.json`.

## 3. Những gì đã tự chạy lại

Môi trường: Linux, Node 24.14.1, Xvfb kèm icewm (để lệnh thu nhỏ có tác dụng), Electron 44.4.5, `TZ=Asia/Ho_Chi_Minh`.

| Hạng mục | Báo cáo agent (Windows) | Orchestrator chạy lại (Linux) | Kết quả |
|---|---|---|---|
| `npm run check` | 10/10 lần liên tiếp, 1555 | **2/2 lần, 1555/1555** | khớp |
| Phép cắn UI-16: biến đổi `src/main.tsx` chậm 7 s | tệp cũ hỏng, tệp mới 17/17 | Một plugin Vite tạm trên bản sao chờ 7 s khi biến đổi `src/main.tsx`: **tệp mới 17/17 đạt; tệp cũ 16/17 hỏng** ("Test timed out in 5000ms") | khớp |
| `app_root.test.tsx` chạy riêng | hỏng 1/5 lần ở mốc đầu phiên | 0/25 lần hỏng | không tái hiện (§5.3) |
| `npm run e2e`, máy để yên | 10/10 lượt, 70 ca | **2/2 lượt, 70/70** | khớp |
| `npm run e2e`, vòng lặp thu nhỏ cửa sổ mỗi 9 s | — | **2/2 lượt, 70/70**; 9 và 12 lần mở lại | đạt, xem dưới |
| `UI/evidence` | không đổi | Băm 120 tệp trước và sau bốn lượt: giống hệt | đạt |
| Nhật ký chụp ảnh của lượt cuối trên máy Project Owner | 0 lỗi | 107 lần chụp, 0 lỗi, 0 `minimized:true`, lâu nhất 166 ms | khớp |
| Checkpoint | YAML hợp lệ, `UNSOLVED_PROBLEMS: []` | Parse hai khối: hợp lệ, không trùng id; `screens` không còn NOTES; `main` còn 6 NOTES, đều còn đúng | đạt |
| Giờ trong checkpoint | — | `main` 13:20:16, tệp ghi 13:20:28; `screens` 12:56:44, tệp ghi 12:57:14 | đúng quy ước BE-8 |

**`showInactive()` trên Linux khác Windows.**
- Với icewm, `showInactive()` **không** đưa cửa sổ khỏi trạng thái thu nhỏ: hai lượt có vòng lặp thu nhỏ ghi 48 và 62 lần chụp lúc cửa sổ còn `minimized:true`.
- Ở phiên 28, với `restore()`, con số này là 0.
- Trên Linux điều này vô hại: cửa sổ thu nhỏ vẫn vẽ, nên không có gì treo và mọi ca vẫn đạt.
- Trên Windows, số đo của agent cho thấy `showInactive()` có đưa cửa sổ khỏi trạng thái thu nhỏ, 20/20 lần. Công cụ đọc `isMinimized()` sau mỗi lần mở lại. Nhật ký mười lượt trên máy Project Owner cũng có 0 lần chụp lúc cửa sổ còn thu nhỏ.
- Cơ chế này chỉ cần đúng trên Windows, nơi duy nhất có lỗi treo.

## 4. Đối chiếu với plan

- **UI-18:**
  - Đo trước rồi mới chọn, đúng plan.
  - Điều kiện "người dùng đang ở ứng dụng khác" dùng một **tiến trình** riêng giữ nền trước, không phải một cửa sổ trong cùng tiến trình. Lý do ghi ở `main-EXP-027`: Windows cho một tiến trình đẩy cửa sổ của chính nó lên dễ hơn.
  - Agent tự phát hiện và sửa một lỗi đo của mình (so nhầm pid).
  - Bảng số đo, 20 lần mỗi cách:
    - `restore()`: giành nền trước 18/20;
    - `showInactive()`: 0/20, hết thu nhỏ, không treo;
    - `show()`: 20/20;
    - `maximize()` rồi `unmaximize()`: 20/20, trái với lời tài liệu.
  - Áp `showInactive()`. Không gọi `focus()`, không đổi `Desktop/`.
- **Phần còn lại của UI-18:**
  - Sau câu trả lời của Project Owner, agent viết thêm `ui18_launch_probe.mjs`, ngoài ba việc của plan. Orchestrator **chấp nhận**: công cụ chỉ đo, không đổi hành vi, không thuộc `npm run e2e`, và trả lời đúng câu hỏi của Project Owner.
  - Kết quả: 3 lần khởi động trong lúc máy đang dùng, ứng dụng vào nền trước 2/3 lần, sau 2,3 s và 3,8 s.
  - Mẫu nhỏ; agent tự nêu giới hạn. Nhưng nó khớp với dữ liệu: 10 lượt chỉ có 2 lần mở lại, mỗi lượt khoảng 16 lần khởi động, mà Project Owner vẫn bị giành tiêu điểm.
- **UI-16:**
  - Đo trước: chạy riêng, ca đầu khoảng 1000 ms, ca hai khoảng 15 ms.
  - Sửa bằng `beforeAll`, giới hạn 60 s ghi lý do ngay tại chỗ. Giới hạn của các ca không đổi; `vi.resetModules()` vẫn chạy trước mỗi ca, nên mỗi ca vẫn chạy Main từ đầu.
  - Phép cắn rõ ràng.
- **UI-17:**
  - `main_layout.spec.ts` có cơ chế mở lại cửa sổ.
  - NOTES: `main` xóa 2, `screens` xóa 4. Phần còn giá trị chuyển sang `main-EXP-029` và `screens-EXP-048`.
  - Sáu NOTES còn lại của `main` đều còn đúng.

## 5. Phát hiện

### 5.1 Cửa sổ ứng dụng giành tiêu điểm khi khởi động (trung bình) — DSK-18, phần còn lại của UI-18

- `Desktop/src/main.ts` tạo `BrowserWindow` hiện ra ngay, nên cửa sổ được kích hoạt.
- **Với người dùng thật, đây là hành vi đúng:** mở ứng dụng thì cửa sổ phải lên trước.
- Với e2e, mỗi lượt có khoảng 16 lần khởi động. Mỗi lần có thể giành tiêu điểm và nhận phím Project Owner đang gõ ở ứng dụng khác, như UI-18 đã nêu.

**Đề xuất (chờ Project Owner chọn):**
- **A (Orchestrator khuyến nghị):** thêm một cờ kiểm thử mới chỉ cho bản chạy từ mã nguồn, ví dụ `--ct-test-show-inactive`. Khi có cờ này, Desktop Main tạo cửa sổ với `show: false` rồi gọi `showInactive()` khi cửa sổ sẵn sàng.
  - Hành vi khi người dùng mở ứng dụng không đổi. Bản đóng gói bỏ qua cờ này như mọi cờ `--ct-test-*` khác.
  - **Làm hai bước:**
    - phiên desktop thêm cờ (gộp vào phiên 30 cùng DSK-17), có kiểm thử của Desktop: có cờ thì cửa sổ không lấy tiêu điểm, không cờ thì như cũ;
    - phiên giao diện kế tiếp thêm cờ vào lệnh khởi động của công cụ kiểm thử (`launchArgs`) và của `main_layout.spec.ts`, rồi Project Owner xác nhận không còn bị giành tiêu điểm.
  - Chi phí nhỏ. Mỗi phiên agent đang chạy e2e khoảng một giờ trong lúc Project Owner dùng máy.
- **B:** chấp nhận ở V1. Project Owner tránh dùng máy, hoặc tránh gõ phím ở ứng dụng khác, khi e2e chạy.

### 5.2 `showInactive()` trên Linux không đưa cửa sổ khỏi trạng thái thu nhỏ (ghi nhận)

- Xem §3. Không ảnh hưởng gì vì Linux không treo.
- Nếu sau này có bản Linux mà cơ chế này cần chạy đúng ở đó, phải xem lại cách mở lại cửa sổ trên Linux.

### 5.3 `app_root.test.tsx`, ca D6, hỏng ngắt quãng (thấp) — UI-19

- **Triệu chứng:** dòng 291 `expect(loadPending).toHaveBeenCalledTimes(3)` nhận 2, một lần trong 5 lần chạy mốc đầu phiên lúc máy tải. Orchestrator không tái hiện trong 25 lần chạy riêng trên Linux.
- **Giả thuyết của agent, Orchestrator thấy hợp lý:** câu thông báo "Đã lưu cài đặt nhắc việc." hiện ngay khi `reminder_list` dựng xong. Còn lần gọi `loadPending` thứ ba nằm trong `useEffect`, chạy sau lần dựng đó. Khẳng định ngay sau `findByText` có thể chạy trước lần gọi đó.
- Cùng loại với `screens-EXP-012` (UI-12, phiên 25).
- **Việc cho phiên giao diện kế tiếp:** chờ bằng `vi.waitFor` thay vì khẳng định ngay. Có phép cắn tất định (làm lần gọi thứ ba đến chậm thì kiểm thử cũ hỏng, kiểm thử mới đạt). Không nới thời gian chờ.

## 6. Trạng thái

- **UI-16:** đóng 2026-10-04, phiên 29.
- **UI-17:** đóng 2026-10-04, phiên 29.
- **UI-18:** phần mở lại cửa sổ đóng ở phiên 29. Phần lúc khởi động chuyển thành DSK-18; UI-18 còn mở cho tới bước giao diện của phương án A.
- Mở **UI-19** (thấp) và **DSK-18** (trung bình, chờ Project Owner chọn A hay B).
- Không trang nào đổi trạng thái.

## 7. Commit

- **`CAS29 - UI: UI-18 showInactive, UI-16, UI-17`:** các tệp ở §2. Không gồm `UI/test-results/`.
- **`OS - Audit session 29`:** bản audit này, `open_issues.md`, `v1_roadmap.md`, `CLAUDE.md`.
