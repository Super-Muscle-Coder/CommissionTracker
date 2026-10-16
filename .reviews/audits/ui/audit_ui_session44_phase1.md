# Audit phiên 44, pha 1 — giao diện (chặng H, kiểm độc lập)

**Ngày audit:** 2026-10-16. **Người audit:** Orchestrator.
**Phiên được audit:** phiên 44, pha 1 (chỉ đọc). Định danh chờ Project Owner xác nhận; agent tạm ghi `coding-agent@2026-10-16#?`.
**Plan:** `.plan/ui_plan.md` (pha 1). Hợp đồng: Data Schema `10.0.1`, API Contract `6.2.0`.

## 1. Kết luận

**Pha 1 đạt.** Phiên làm đủ những gì plan đòi:
- trả lời K1 → K9;
- `npm run check` (1936/1936) và `npm run e2e` không đặt runner (83/83), mỗi lệnh một lượt;
- phép cắn cho cả R1 → R14 cùng chiều ngược của R5, R7, R12, R14, cộng mười một phép cắn hành vi đủ ba phân khu, trên bản sao ngoài kho;
- không sửa tệp nào trong kho; `git status` và mốc `%APPDATA%` không đổi.

Phiên làm nhiều hơn plan đòi, có ích: đột biến từng ô trong 100 ô nhãn và 224 nhánh `kind`, và một script riêng đối chiếu 33 bảng gọi với hợp đồng.

Năm phép cắn không bị bắt tôi đều tái lập được trên Linux (§2). Phát hiện nặng nhất là **R44-1**: luật R7 không được máy giữ ở tệp `.tsx` của kit. Theo định nghĩa của plan, đây là mức cao.

Phiên tự tìm ra được những việc đã biết mà không đọc sổ tồn đọng: UI-23 (R44-2), UI-22 (nằm trong R44-10), và H-6 (đã làm lại toàn bộ phép cắn R1–R14).

## 2. Tôi tự kiểm lại

**Kho.** `UI/` không đổi kể từ `CAS37`. Bản sao `/home/claude/audit44` dựng từ `git archive` của HEAD (`6d4546b`), dùng `node_modules` của bản sao phiên 40; `package-lock.json` giống hệt.

**`npm run check` trên Linux** (Node 24.14.1): đạt.
- `lint:contrast`: 19 cặp chữ, 13 cặp phi văn bản.
- `lint:layer`: 191 tệp.
- vitest: 43 tệp, 1936/1936.

Số liệu khớp báo cáo. Tôi không chạy lại e2e, vì e2e cần Desktop và Backend chạy trên Windows; agent báo 83/83.

**Phép cắn tôi tự làm lại**, mỗi phép trên bản sao, xong thì khôi phục và so lại với HEAD:

| Phép | Lệnh | Kết quả | Khớp agent? |
|---|---|---|---|
| R44-1: `kit/_v.tsx` có `fill="#ff0000"`, `width="16px"`, `rgb(1,2,3)` | `typecheck`, `lint`, `lint:style`, `lint:layer` | cả bốn đều exit 0 | khớp |
| R44-2: `manage_client/adapters.ts` gọi `GET /watermark-profiles` | `npm run check` | exit 0, 1936 đạt | khớp |
| R44-4: chữ của `Caption` đổi sang `--color-action-text-disabled` | `lint:style`, `lint:contrast` | exit 0, vẫn "19 + 13 cặp, đều đạt" | khớp |
| R44-5: `Caption` dùng `var(--base-gray-600)` | `lint:style`, `lint:contrast`, `lint` | đều exit 0 | khớp |
| R44-6: Routers `manage_client` thêm kiểm "tên không có chữ số" | vitest | 1936 đạt | khớp |

**Đọc mã.**
- R44-3: `createIpcBridge` chuyển tiếp mọi địa chỉ, không kiểm danh sách. Đúng như agent tả.
- R44-9: Configs của bảy workflow ghi `api_contract.yaml 4.0.0`, `restore_data` ghi `5.0.0`; hiện hành là `6.2.0`.
- R44-10: đúng 11 NOTES quá 14 ngày: `main` 5, `kit` 2, `update_progress` 1, `view_income_report` 3.

## 3. Đánh giá từng phát hiện

### 3.1 Đồng ý, sửa ở pha 2

| Mã | Mức | Việc ở pha 2 |
|---|---|---|
| R44-1 | **cao** | Luật lint cho `kit/**/*.{ts,tsx}`: cấm giá trị màu và đơn vị độ dài tuyệt đối dạng literal (hex, `rgb`/`hsl`, tên màu, `px`/`pt`/`cm`/`mm`/`in`). Cắn lại ba dạng của R44-1, phải bị bắt; các tệp kit hiện có phải vẫn đạt |
| R44-2 | **cao** (là UI-23) | Bước kiểm trong `npm run check` làm lệnh hỏng khi `UI/src/` hay `UI/tests/` chứa `/watermark-profiles`, `/watermark-strengths`, `/artworks`, `/verifications`. Cắn: thêm một chuỗi thì hỏng, bỏ đi thì đạt. Tôi nâng mức từ trung bình lên cao, cho khớp UI-23 |
| R44-3 | trung bình | `SCAFFOLD_UI_CONFIGS` có danh sách địa chỉ `ipc` nhãn `[CONTRACT]` (năm địa chỉ: `dialog:open-file`, `dialog:pick-folder`, `restore:prepare`, `restore:status`, `restore:cancel`); `createIpcBridge` từ chối địa chỉ ngoài danh sách bằng một Promise bị từ chối, giống cách Desktop từ chối (API 6.2.0). Cắn: gọi `dialog:save-file` thì phải bị bắt |
| R44-4 | trung bình | `check_contrast.mjs` báo lỗi khi một CSS module dùng một token màu chữ (hay viền) chưa có trong danh sách cặp. Cách làm agent chọn, ghi lý do. Cắn: phép B6b phải bị bắt |
| R44-5 | trung bình | Luật stylelint cấm `var(--base-*)` ngoài `tokens.css`. Cắn: B6c phải bị bắt |
| R44-6 | trung bình | Với mỗi trường chữ tự do mà Routers kiểm, thêm ca "chữ số, emoji, ký tự đặc biệt vẫn qua". Cắn: B2b phải bị bắt |
| R44-7 | trung bình | Tám ca còn thiếu của ma trận I5 |
| R44-9 | thấp | Configs ghi phiên bản hợp đồng hiện hành (`6.2.0`, `10.0.1`). Không thêm script đọc `.contracts/` (cần thêm gói phân tích YAML; không đáng ở V1) |
| R44-10 | thấp (gồm UI-22) | Bỏ 11 NOTES quá hạn |
| R44-11 | thấp | Gộp EVIDENCE cũ của `main`, `screens`, `kit` thành mục bản mới nhất (Giao thức 07); chuyển kinh nghiệm thật vào EXPERIENCES |
| R44-12 | thấp | EVIDENCE chạy thật của `backup_data` ghi trang `backup`, bước S1–S5; bỏ số liệu cũ |
| R44-14 | thấp | Quyết định "lỗi nào còn sau khi đổi số hàng" chuyển vào Services, như `send_reminder` đã làm |
| R44-16 | thấp | `walkthrough_app.mjs` kiểm đường dẫn nằm trong thư mục tạm và có tiền tố `ct-ui-walkthrough-` trước khi xóa |
| R44-17 | thấp | Ca `main_layout.spec.ts:88` chờ theo điều kiện thay cho `waitForTimeout(2000)`. Ba công cụ chẩn đoán `tests/tools/ui11_probe.mjs`, `ui18_probe.mjs`, `ui18_launch_probe.mjs` của UI-11, UI-18 đã đóng: xóa, sau khi kiểm không lệnh `npm run` nào và không tệp nào khác dùng chúng |

### 3.2 Cần quyết định ở đặc tả I1 — tôi đề xuất ghi thành ngoại lệ có chủ đích

Ba phát hiện này đúng về mặt chữ của iWCA. Nhưng hành vi đang có do chính đặc tả I1 của tôi yêu cầu, hoặc đã được tôi chấp nhận ở các audit trước, mà chưa ghi lý do thành ngoại lệ trong `ui_decomposition.md`. Đó là lỗi tài liệu của tôi.

- **R44-8** (Services "suy ra thao tác hợp lệ" từ dữ liệu): ẩn khách đã lưu trữ khỏi danh sách chọn; khóa nút đổi giai đoạn khi đơn ở `finished`/`cancelled`; ẩn nút hủy ở khoản đã hủy.
  - Lý do giữ: đây là chuyện không mời người dùng làm một việc chắc chắn hỏng. Backend vẫn phán quyết bằng 409, và giao diện vẫn hiển thị đúng phán quyết đó.
  - Các luật này nằm trong `description` của hợp đồng, nên backend không đổi được chúng mà không đổi hợp đồng. Phép thử §5 vì thế không trượt hẳn.
  - **Đề xuất:** ghi vào `ui_decomposition.md` một mục "Ngoại lệ có chủ đích của iWCA §5", liệt kê ba chỗ cùng lý do. Mã không đổi.
- **R44-13** (`IPC_FAILED`, `DIALOG_FAILED` đi vào `rejected` thay vì `unreachable`): đã chấp nhận ở audit phiên 34 và 37. **Đề xuất:** ghi cùng mục ngoại lệ, kèm lý do; mã không đổi.
- **R44-15** (`commission_detail` có ba hook): plan phiên 20 và 22 đã chọn. **Đề xuất:** ghi cùng mục; mã không đổi.

  Phần sơ đồ `CLAUDE.md` mục 4 thiếu `tests/main/`, `tests/tools/`, `tests/fixtures/`: tôi sửa `CLAUDE.md`, agent không cần làm gì.

Riêng **R44-14, phần tải lại**: hook tải lại danh sách khách sau mọi từ chối `system`, trong khi đặc tả D2 chỉ nêu 404 và 409. Tải lại thêm vô hại. **Đề xuất:** sửa đặc tả D2 cho khớp mã. Phần còn lại của R44-14 (quyết định nằm trong hook) vẫn sửa ở pha 2.

### 3.3 Phép cắn hành vi B2 và B3 "bắt ngẫu nhiên"

Agent ghi đúng rằng B2 (tên ≥ 3 ký tự) và B3 (Services tự tính `outstanding`) chỉ bị bắt nhờ dữ liệu mẫu tình cờ. R44-6 đã che phần Routers. Phần Services (tự tính một con số mà hợp đồng giao cho phía sau) không có ca chủ đích. Tôi không mở mục riêng: ma trận I3 đã khẳng định Services trả đúng con số nhận được từ phía sau. Ghi nhận ở đây để phiên sau biết.

## 4. Ghi nhận về cách làm của phiên

- Lần dựng bản sao đầu, agent dùng `/XD dist` theo tên, nên loại nhầm cả `node_modules\*\dist`. Agent tự nhận ra, xóa đúng thư mục và dựng lại với đường dẫn đầy đủ. Bài học cho plan sau: ghi `/XD` bằng đường dẫn đầy đủ.
- Agent không chạy e2e trên bản sao, vì không phép cắn nào cần. Hợp lý.
- Project Owner chưa trả lời hai câu hỏi (phiên trong ngày, antivirus). Agent ghi rõ là chưa xác nhận.

## 5. Việc tồn đọng và đề xuất pha 2

Ghi vào `.plan/open_issues.md`, mục "Chặng H — phiên kiểm độc lập giao diện (phiên 44)".

**H-6 đóng ngay** (2026-10-16, phiên 44 pha 1): toàn bộ phép cắn R1–R14 và chiều ngược đã làm lại. Chỗ hở duy nhất là R44-1.

**Phạm vi pha 2:**
- các mục ở §3.1;
- việc đã biết:
  - UI-21: dọn sau khi sửa `.gitignore`;
  - UI-23: gộp với R44-2;
  - UI-22: gộp với R44-10;
  - `UI/package.json` còn `0.1.0`: đề xuất đổi thành `1.0.0` cho khớp bản V1. Trường này không đi vào bản đóng gói, chỉ để nhất quán;
- **chạy:** `npm run check` 3 lượt và `npm run e2e` 3 lượt liên tiếp trên máy Project Owner đang được dùng, không đặt runner, theo tiêu chí ổn định của chặng H.

Các mục ở §3.2 do Orchestrator ghi vào đặc tả I1 sau khi Project Owner duyệt; không có việc cho agent.

## 6. Quyết định của Project Owner (2026-10-16)

- **Bảng §3.1:** duyệt cả bảng. Pha 2 sửa đủ 14 mục, cộng UI-21, UI-22 (trong R44-10), UI-23 (trong R44-2).
- **Ba mục §3.2 (R44-8, R44-13, R44-15):** ghi thành ngoại lệ có chủ đích. Orchestrator đã ghi `.design/ui_decomposition.md` §8; mã không đổi. Đặc tả D2 (`commission_form`) sửa cho khớp mã: tải lại danh sách khách sau mọi lần phía sau từ chối việc lưu. `CLAUDE.md` mục 4 thêm `tests/main/`, `tests/tools/`, `tests/fixtures/`.
- **`UI/package.json`:** đổi `version` thành `1.0.0` ở pha 2, cùng `package-lock.json`.

**Đính chính của Orchestrator (R44-17, §3.1):** ca `main_layout.spec.ts:88` ngủ 2 s để chứng minh *không có* thông báo lỗi CSP hay lỗi trang; một lần chờ theo điều kiện chỉ làm được nếu có một sự kiện dương xảy ra sau lúc Electron in cảnh báo. Plan pha 2 giao agent tìm điều kiện đó; không có thì giữ lệnh ngủ và ghi lý do.

Plan pha 2: `.plan/ui_plan.md` (2026-10-16). Prompt: `.reviews/prompts/ui/session44_phase2_prompt.md`.
