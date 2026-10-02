# AUDIT — PHIÊN 25 (LAYER GIAO DIỆN, VÁ NGẮN: CT-5, UI-12, UI-11)

*Orchestrator, 2026-10-01. Đối chiếu với `.plan/ui_plan.md` (plan phiên 25), Data Schema 9.0.2 (CT-5), `.plan/open_issues.md` (CT-5, UI-12, UI-11), skill `iwca-implementation`, và các khối checkpoint `view_income_report`, `screens`, `main`. Định danh phiên của agent: `coding-agent@2026-10-01#1`. Mốc so sánh: commit `c800b6a`. Orchestrator đã xác nhận `CAS24` trong kho trùng khớp với mã đã audit ở phiên 24.*

## 1. Kết luận

**Đạt.** Ba việc đều làm đúng plan, số liệu khớp khi chạy lại.

- **CT-5:** xong, hành vi không đổi.
- **UI-12:** **đóng**. Nguyên nhân được Orchestrator chứng minh độc lập bằng một phép thử tất định (§3).
- **UI-11:** thí nghiệm đúng thiết kế, cho kết quả quan trọng: chỉ cửa sổ **bị thu nhỏ** làm lệnh chụp treo; không cờ Chromium nào chữa được. Agent đúng khi không làm việc 4c. UI-11 vẫn mở; bước tiếp theo cần một câu trả lời của Project Owner (§5.1).

## 2. Phạm vi sửa

Liệt kê toàn bộ `UI/src`, `UI/tests`, `UI/scripts` trên máy Project Owner: chỉ các tệp sau có thời điểm ghi trong phiên, khớp báo cáo.

- `view_income_report`: `configs.ts`, `adapters.ts`, `entities.ts`, `routers.ts`, `tests/adapters.test.ts`.
  - Chỉ đổi `dataSchema: '9.0.2'` và chú thích.
  - Chú thích luật thứ tự ngày trích đúng `input_expected.period_to.type`.
  - Không dòng mã chạy nào khác đổi.
- `services.ts` (`view_income_report`), `navigation.ts` (`screens`), `main.tsx` (`main`): **chỉ khối checkpoint** đổi; Orchestrator lọc diff, không còn dòng ngoài chú thích.
- `StageChange.test.tsx`: hai khẳng định focus chuyển sang `await vi.waitFor(...)`. Mã kit và trang không đổi.
- `tests/tools/ui11_probe.mjs`: công cụ chẩn đoán mới, không thuộc `npm run e2e` hay `npm run check`.
- Configs của workflow khác không đổi.

## 3. Những gì đã tự chạy lại

Môi trường: Linux, Node 24, Xvfb, Electron 44.4.5, Chromium 152.

| Hạng mục | Báo cáo agent | Orchestrator chạy lại | Kết quả |
|---|---|---|---|
| `npm run check` | 1303 | **1303/1303, hai lần**; `check_layer` không vi phạm; `lint:e2e` sạch | khớp |
| `StageChange.test.tsx` chạy riêng | 0/50 hỏng sau khi sửa (3/50 trước) | **0/50** hỏng | khớp |
| Cắn UI-12: focus đến chậm 40 ms | — | Kiểm thử **cũ hỏng** (1 ca), kiểm thử **mới đạt**: tái hiện tất định đúng cơ chế agent nêu | đạt |
| Cắn UI-12: bỏ hẳn lệnh focus | — | Kiểm thử mới **hỏng** (1 ca): `waitFor` không che lỗi thật | đạt |
| `npm run e2e` | 5/5, 59 ca | **3/3, mỗi lần 59 ca**, không đặt runner | khớp |
| UI-8 | `UI/evidence` nguyên vẹn | Băm toàn bộ trước và sau: giống hệt | đạt |
| Công cụ UI-11 trên Linux | — | 4 điều kiện × 10 lần, 0 lần treo, lâu nhất 85 ms; ở điều kiện "thu nhỏ", công cụ tự ghi `minimized: false` | ghi nhận (§5.1) |
| Checkpoint | không `UNSOLVED_PROBLEMS` | Parse ba khối: hợp lệ, không trùng id, `UNSOLVED_PROBLEMS: []` | đạt (§5.3) |

Lần chạy e2e đầu tiên của Orchestrator hỏng 12 ca vì Xvfb trên máy Orchestrator đã dừng ("The platform failed to initialize"). Đó là lỗi môi trường audit; khởi động lại Xvfb thì đạt 3/3. Không tính.

## 4. Đối chiếu với plan

- **CT-5:** đúng việc 2. NOTE câu hỏi cũ được giữ, có thêm dòng trả lời.
- **UI-12:** đúng việc 3.
  - **Nguyên nhân:** kit đặt focus trong `useEffect` (`SelectField.tsx:40`, `ConfirmPanel.tsx:32`); effect chạy sau lần commit đưa `alert` hay khung xác nhận vào DOM, nên `findByRole` có thể trả về trước khi focus tới.
  - **Phạm vi sửa:** chỉ sửa kiểm thử, đúng chỗ. Các trang khác đã chờ focus sẵn. Bốn khẳng định `isFocused(...)).toBe(false)` còn lại không chờ, nhưng đó là kiểm tra đồng bộ ngay sau `.focus()` thủ công, không có cùng nguy cơ.
- **UI-11:** đúng việc 4.
  - Agent đo cả "bị che" lẫn "mất tiêu điểm", vì plan không nói rõ điều kiện (iii) là gì; hợp lý.
  - Cờ được đọc lại trong tiến trình bằng `app.commandLine` trước khi tin.
  - Không thêm cờ vào harness hay ứng dụng.
  - Agent nói rõ những gì **chưa** chứng minh được.

## 5. Phát hiện

### 5.1 UI-11 — nguyên nhân gần như chắc chắn là cửa sổ bị thu nhỏ; cần Project Owner xác nhận

**Dữ liệu của agent (Windows):** thu nhỏ → 11/20 lần treo; bị che, mất tiêu điểm, bình thường → 0/20 mỗi điều kiện. Không bộ cờ nào đưa về 0. Kết quả 3/20 với cả bốn cờ không lặp lại được (lần sau 10/20).

**Dữ liệu của Orchestrator (Linux):** dưới Xvfb không có trình quản lý cửa sổ, lệnh thu nhỏ không có tác dụng (công cụ ghi `minimized: false`). Điều đó giải thích vì sao qua hàng trăm lượt chụp trên Linux chưa lần nào treo.

**Ghép với dữ liệu cũ:**
- treo xảy ra ở bước bất kỳ, backend bật hay tắt đều có;
- có hai mode (dưới 2,5 s hoặc đúng 30 s);
- đi thành cụm vào lúc Project Owner có thể đang dùng máy (23:55–00:31 ngày 30/9, và các phiên trước);
- ảnh chụp khi hỏng của Playwright ngay sau đó lại chụp được.

Tất cả khớp với giả thuyết: **trong lúc e2e chạy, cửa sổ Electron bị thu nhỏ** (bấm nút thu nhỏ, Win+D, hay "Show desktop"). Riêng ảnh chụp khi hỏng chụp được thì Orchestrator chưa giải thích chắc được: có thể cửa sổ đã được mở lại, hoặc Playwright chụp khi hỏng bằng đường khác.

**Chưa chứng minh:** chưa có bằng chứng cửa sổ bị thu nhỏ đúng lúc các lần treo cũ. **Câu hỏi cho Project Owner:** trong lúc agent chạy e2e trên máy anh (phiên 19–24), anh có từng thu nhỏ các cửa sổ Electron bật lên, hay dùng Win+D / "Show desktop", không?

**Đề xuất bước tiếp:**
1. **Ngay, không cần mã:** quy ước vận hành: khi e2e đang chạy, không thu nhỏ cửa sổ Electron và không dùng "Show desktop"; muốn làm việc khác thì để cửa sổ nằm sau. Ghi vào `CLAUDE.md` mục 5 nếu Project Owner đồng ý.
2. **Phiên giao diện kế tiếp, chỉ ghi:** harness ghi thêm trạng thái cửa sổ (`isMinimized`, `isVisible`, `visibilityState`) vào nhật ký thời gian chụp ảnh, cạnh mỗi lần chụp. Lần treo sau sẽ cho câu trả lời dứt khoát.
3. **Chỉ khi (2) xác nhận:** Project Owner quyết có cho harness tự mở lại cửa sổ trước mỗi lần chụp (`restore()`), và ghi lại mỗi lần phải làm vậy, hay chỉ dựa vào quy ước (1). Đây là điều kiện của môi trường kiểm thử; ứng dụng thật không chụp ảnh nên không bị ảnh hưởng.

### 5.2 UI-12 — đóng

Nguyên nhân rõ, sửa đúng chỗ, kiểm thử mới vẫn bắt được lỗi thật. **Đóng 2026-10-01, phiên 25.** Tiêu chí đóng của `open_issues` là 50 lần trên Windows: agent đạt 0/50 hỏng, Orchestrator cũng 0/50 trên Linux, cộng phép thử tất định ở §3.

### 5.3 Thời điểm trong checkpoint vẫn muộn hơn lúc ghi tệp, nhưng đã gần đúng (thấp)

| Khối | Ghi trong checkpoint | Tệp được ghi lúc |
|---|---|---|
| `view_income_report` | 22:02:30 | 22:02:19 |
| `screens` | 22:03:00 | 22:02:19 |
| `main` | 22:04:00 | 22:02:43 |

Lệch từ vài chục giây tới khoảng một phút; trước đây là vài phút. Agent có lấy giờ bằng lệnh, nhưng có vẻ làm tròn lên. Plan sau ghi thêm: chép nguyên giá trị `Get-Date -Format o`, không làm tròn. Không cần sửa các giá trị này.

## 6. Trạng thái trang

Không trang nào đổi trạng thái. `income_report` vẫn chờ Project Owner chạy tay D5. Phiên này không đổi hành vi trang đó.

## 7. Commit

`CAS25`, gồm các tệp ở §2 và `UI/evidence` do các lượt có runner ghi. Không gồm `UI/test-results/` (git bỏ qua; kết quả công cụ chẩn đoán nằm ở đó).
