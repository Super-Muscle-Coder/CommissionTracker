# AUDIT — PHIÊN 21 (LAYER GIAO DIỆN, PHIÊN VÁ: UI-10)

*Orchestrator, 2026-09-29. Đối chiếu với `.plan/ui_plan.md` (plan phiên 21) và `.plan/open_issues.md` UI-10. Định danh phiên của agent: `coding-agent@2026-09-29#3`. Mốc so sánh: mã `UI/` của phiên 20 (đã audit ở `audit_ui_session20.md`).*

## 1. Kết luận

**Đạt. UI-10 đóng.** Chỗ không tất định mà audit phiên 20 tìm ra không còn tái hiện trên máy thứ hai, và phép kiểm tĩnh mới chặn lỗi cùng loại.

Còn một hiện tượng khác chỉ xảy ra trên Windows: `page.screenshot` hết 30 s. Hiện tượng này **không** do mã giao diện, và không tái hiện trên máy thứ hai. Orchestrator ghi thành UI-11 để chẩn đoán (§5). Theo nhận định của Orchestrator, nó **không** chặn `hoàn_tất` của năm trang D2 và D3; lý do ở §6.

## 2. Phạm vi sửa

Liệt kê thời điểm sửa của mọi tệp trong `UI/` (trừ `node_modules`, `dist`, `test-results`, `obj`, `evidence`) sau khi phiên 20 kết thúc: **đúng 7 tệp**, khớp báo cáo.

- `UI/package.json`: thêm `lint:e2e` và nối vào `check`. Không bước nào khác đổi.
- `UI/scripts/check_e2e_status.mjs`: mới.
- Ba spec: `client_detail`, `client_form`, `commission_form`.
- `src/main.tsx`, `src/screens/navigation.ts`: Orchestrator lọc diff, bỏ mọi dòng chú thích thì **không còn dòng nào**, tức chỉ đổi khối checkpoint. Đúng ngoại lệ của plan.

`UI/evidence`: 71 tệp đổi, là các lần chạy có tên người chạy. Đúng dự định.

## 3. Những gì đã tự chạy lại

Môi trường: Linux, Node 24.14.1, Xvfb; Backend ở trạng thái phiên 18.

| Hạng mục | Báo cáo agent | Orchestrator chạy lại | Kết quả |
|---|---|---|---|
| `npm run check` | 780, có bước `lint:e2e` | 780/780, hai lần; `check_e2e_status` báo sạch | khớp |
| Spec `commission_form` chạy riêng | 30/30 | **40/40** (trước bản vá: 3/45 hỏng, audit phiên 20) | UI-10 đóng |
| `npm run e2e` toàn bộ | 5/5 có runner; không runner hỏng 3/8 (chụp ảnh) | **6/6**, mỗi lần 42, không đặt biến; không lần nào hết giờ chụp ảnh | đạt trên máy thứ hai |
| UI-8 | nguyên vẹn ở các lần đạt | Băm toàn bộ `UI/evidence` trước và sau 6 lần: giống hệt | đạt |
| Cắn phép kiểm tĩnh | hoàn nguyên một dòng thì hỏng | Đổi dòng 109 của `commission_form` về dạng chưa lọc: báo đúng `:109`, mã thoát 1. Dạng `.not.toContainText` trên `getByRole('status')`: bị bắt. Dạng có `name`: không bị báo (đúng) | đạt, kèm một giới hạn (Q21-1) |

## 4. Đối chiếu từng việc của plan

- **Việc 2, 3:** 11 khẳng định đổi sang `getByRole('status').filter({ hasText })` kèm `toHaveCount(1)`. Gồm:
  - 4 chỗ plan nêu;
  - `commission_form:253` (`toContainText`): plan sót, agent sửa đúng nhóm;
  - 6 chỗ ở hai spec D1.

  Giữ 11 chỗ `toHaveCount(0)` (1 ở `commission_form`, 10 ở harness), có lý do cho từng chỗ. Ý nghĩa bước trong `walkthrough.yaml` không đổi.
  - Lưu ý nhỏ: `filter({ hasText })` khớp một phần chuỗi, còn `toHaveText` khớp đúng cả chuỗi. Khẳng định vì vậy lỏng hơn một chút, nhưng mọi câu thông báo trong các trang này khác nhau đủ để không gây nhầm. Chấp nhận.
- **Việc 4:** script đọc cây cú pháp bằng `typescript` (đã có trong phụ thuộc), chỉ đọc tệp, có thông báo lỗi nêu tệp, dòng và cách sửa.
- **Việc 5:** `main_layout.spec.ts` không hỏng lần nào trong 14 lần của phiên. Hiện tượng chụp ảnh lại xuất hiện ở chỗ khác (§5, UI-11).
- **Việc 7:** checkpoint `screens-EXP-026`, `main-EXP-016`, EVIDENCE, NOTE. Không `UNSOLVED_PROBLEMS`.
- **Không nới thời gian chờ, không `retries`, không `skip`:** đúng. Agent không tự "chữa" hiện tượng chụp ảnh mà ghi lại để Orchestrator quyết, đúng plan.

## 5. Phát hiện

### Q21-1 (thấp) — phép kiểm tĩnh không bắt locator gán vào biến

`const s = page.getByRole('status'); await expect(s).toHaveText('…')` không bị báo, vì script chỉ nhìn đối số trực tiếp của `expect(...)`. Hiện không spec nào viết kiểu này.

Chấp nhận ở V1. Ghi vào UI-10 (phần đóng) để nếu sau này thấy kiểu viết đó thì mở rộng script.

### UI-11 (trung bình, chỉ trên Windows) — `page.screenshot` hết 30 s

**Dữ liệu tới nay** (đều trên máy Windows của Project Owner; máy Orchestrator chưa gặp lần nào trong hơn 20 lần e2e toàn bộ của ba phiên):

| Phiên | Bước | Có đặt runner |
|---|---|---|
| 19 (mốc đầu phiên) | `client_detail` S4 (backend tắt) | có |
| 20 | `main_layout.spec.ts` | có |
| 21 | `client_detail` S4 (backend tắt), `stage_change` S4 (backend tắt), và một lần chưa rõ bước | không; 3 trong 8 lần |

**Điều đã biết:**
- phần lớn xảy ra ở bước **backend đang tắt**;
- không phụ thuộc mã của trang, vì hai trang khác nhau cùng bị;
- Project Owner đã chạy tay các bước backend tắt của D1, D2 và thấy giao diện phản hồi bình thường.

**Chưa biết:** vì sao việc chụp ảnh đứng tới 30 s.
- Giả thuyết a: trên Windows, kết nối tới một cổng đóng trên `127.0.0.1` có thể mất vài giây mỗi lần thay vì bị từ chối ngay. Orchestrator **không chắc** con số, và nó cũng không giải thích được 30 s.
- Giả thuyết b: phần mềm diệt virus quét tệp ảnh vừa ghi.
- Giả thuyết c: cửa sổ Electron không nhận khung hình mới khi không có tiêu điểm.

Chưa có dữ liệu để chọn giả thuyết nào.

**Cách lấy dữ liệu** (cho phiên giao diện sau, không nới thời gian chờ):
- bật `trace: 'retain-on-failure'` trong `tests/e2e/playwright.config.ts`, để lần hỏng sau có đủ ảnh chụp trước lúc đứng, lời gọi mạng và nhật ký;
- ghi thời điểm bắt đầu và kết thúc của mỗi lệnh chụp ảnh ở bước backend tắt;
- Project Owner ghi lại các lần hỏng khi tự chạy e2e.

Quyết định sửa sau khi có trace.

## 6. Trạng thái trang — nhận định của Orchestrator

Năm trang `commission_list`, `commission_detail`, `commission_form`, `progress_board`, `stage_change` **đủ điều kiện `hoàn_tất` về phía Orchestrator**, với điều kiện Project Owner tự chạy tay các bước D3 (báo cáo phiên 20, phần "Bấm tay").

UI-11 không chặn, vì ba lý do:
1. nó không nằm ở logic hay màn hình của trang nào: hai trang khác nhau, cả D1 lẫn D3, cùng bị ở cùng loại bước;
2. trên máy thứ hai, mọi bằng chứng của năm trang ổn định: `commission_form` 40/40, e2e 6/6, và phiên 20 thêm 6/6;
3. chặn trang vì một hiện tượng của công cụ chụp ảnh trên một máy, khi chưa rõ nguyên nhân, sẽ giữ mọi trang ở `đang_làm` vô thời hạn.

Đây khác UI-4, UI-9, UI-10: ba lỗi đó là lỗi logic của spec, đã tìm ra và chứng minh được. Nếu trace cho thấy UI-11 là lỗi của sản phẩm (ví dụ giao diện thật sự đứng khi backend tắt), Orchestrator sẽ mở lại trạng thái các trang liên quan.

## 7. Commit

`CAS21`, gồm cả `UI/evidence`.
