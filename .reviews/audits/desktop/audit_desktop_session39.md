# Audit phiên 39 — desktop, mở đầu chặng G: DSK-28, DSK-29

- Orchestrator, 2026-10-11.
- Plan: `.plan/desktop_plan.md` (phiên 39). Hợp đồng: Data Schema 10.0.1, API Contract 5.0.0, không đổi.
- Mã kiểm: bản trên đĩa của Project Owner lúc 2026-10-11 11:32 (chưa commit), đặt lên `HEAD = 5e8d4ff`. 12 tệp đổi, đều trong `Desktop/`, không có tệp mới. Khớp với báo cáo của agent.

## 1. Kết luận

**Đạt, có một tiêu chí chưa đạt mà tôi chấp nhận.** DSK-28 và DSK-29 đóng.

- **DSK-28:** sửa đúng đặc tả. Lỗi hai hộp thoại có ca tái hiện ổn định (K1), không cần máy tải. K1 hỏng 3/3 lượt khi tôi bỏ cờ chặn, và đạt ổn định khi giữ cờ.
- **DSK-29:** đủ bốn mục. `Desktop/` không còn chỉ thị `eslint-disable` hay `@ts-*` nào.
- **Tiêu chí 4 chưa đạt:** agent không có ba lượt `npm test` có tải nào liền nhau đạt đủ 78/78. Tôi chấp nhận, vì ba lý do (chi tiết ở §5.1):
  1. Phần sửa ở Main chỉ có 12 dòng. Chúng chỉ có thể **bớt** một hộp thoại và bớt một lần gọi `shutdown()` vốn đã trả về ngay. Chúng không thể làm một ca hết giờ.
  2. Mọi ca hỏng khi có tải đều là chỗ nhạy của chính kiểm thử, có từ trước phiên này: chờ có giới hạn, đo tiêu điểm cửa sổ trong lúc Project Owner dùng máy, và một giả định về thứ tự thời gian.
  3. Trên Linux, tôi chạy ba lượt toàn bộ bộ kiểm thử có tải. Ca 6, 14, K1, C1, U1–U6 và A5 đạt cả ba lượt.

  Phần ổn định khi có tải chuyển thành **DSK-30**. Nó là một phần câu hỏi 3 của chặng H.

Gửi Project Owner về câu "tình hình có vẻ chưa ổn": phần agent được giao sửa thì đã ổn. Cái chưa ổn là một số kiểm thử cũ nhạy với máy tải nặng, và hôm qua máy rất không ổn định: cùng mức tải, một lượt mất 5 phút, lượt khác 35 phút. Tôi chưa loại trừ được hoàn toàn một ca: ca 14 "process did not exit within 60000 ms" (§5.1). Mã của phiên này không gây ra được ca đó, nhưng chưa ai đọc log của nó.

## 2. Tệp thay đổi

| Tệp | Nội dung |
|---|---|
| `src/main.ts` | Cờ `fatalReported`, đặt ở đầu `fatal()` trước hộp thoại. Lần gọi sau, hoặc lần gọi khi `shutdownStarted` đã đúng, chỉ ghi một dòng log không có chữ `FATAL:`. Checkpoint: EXP-039, EXP-040, 4 mục EVIDENCE, xóa NOTE ca 14 |
| `src/workflows/restore_data/services.ts` | Chỉ sửa `last_updated_by` thành `coding-agent@2026-10-09#2` |
| `tests/helpers.ts` | `ELECTRON_BINARY` đọc `path.txt` cạnh `require.resolve('electron')`, bỏ `eslint-disable`. Đăng ký thư mục tạm; `removeTempFoldersOfPassedCases()` |
| `tests/fixtures/tee_stderr.cjs` | Sửa chú thích (`-r`, không phải `NODE_OPTIONS`) |
| `tests/desktop_main.spec.ts` | Thêm K1 và C1; ca 6 và 14 khẳng định thêm đúng một dòng `error dialog text` |
| 7 spec khác, gồm `packaged_app` | Thêm một dòng gọi dọn thư mục tạm. `restore_apply`, `restore_data`, `restore_undo` bỏ hàm `tempFolder` riêng (cũng rò rỉ) để dùng hàm chung |

**Code của `fatal()` sau khi sửa** (phần thêm):
```ts
if (fatalReported || shutdownStarted) {
  log(`error after shutdown started or after an earlier failure was reported (no dialog, exit code unchanged): ${message}`)
  return
}
fatalReported = true
```

Lý do agent không dùng lại `shutdownStarted` làm cờ chặn: `shutdown()` tự trả về ngay khi cờ đó đã đặt, nên nếu `fatal()` đặt nó trước hộp thoại thì ứng dụng không bao giờ thoát. Lý do đúng.

## 3. Đối chiếu với plan

| Yêu cầu | Kết quả |
|---|---|
| Đo trước khi sửa | `slow_first_load` + `fake_backend_ready_then_die.py`: 5/5 lượt có hai dòng `FATAL:`; trang `probe`: 0/5. Không cần fixture mới, không thêm cờ |
| Chỉ lần đầu hiện hộp thoại | Đúng |
| Lần bị bỏ qua không có chữ `FATAL:` | Đúng; chữ nguyên văn ở trên |
| Cờ đặt trước hộp thoại | Đúng |
| Liệt kê mọi chỗ gọi `fatal()` | Đủ năm chỗ (EXP-039), tôi đếm lại khớp |
| Không đổi chữ `FATAL:` đầu, câu hộp thoại, mã thoát | Đúng: ca 13 và 14 so nguyên chữ, vẫn đạt |
| Ca 6, 14 khẳng định đúng một hộp thoại | Đúng |
| Ca đóng bình thường | C1 mới: không `FATAL`, không hộp thoại, không dòng bị bỏ qua, mã thoát 0 |
| Ba phép cắn | Đủ; phép (c) khác plan, xem §5.2 |
| DSK-29 (1) thư mục tạm | Xóa khi ca đạt, giữ khi ca hỏng, không quét theo tiền tố. Agent: trước = sau ở mọi lượt đạt |
| DSK-29 (2), (3), (4) | Đúng |
| Tiêu chí 4 (3 lượt có tải liền nhau) | **Chưa đạt**, §5.1 |
| `dist`, `test:packaged` 11/11, UI e2e 83 | Đạt (agent); UI e2e tôi chạy lại cũng đạt |
| Checkpoint | YAML hợp lệ (tôi parse lại); `UNSOLVED_PROBLEMS: []` ở cả hai khối; giờ đúng định dạng BE-8; NOTES của Main còn hai mục ngày 10-05 |
| Chạy lại sau khi sửa checkpoint | Có, một lượt không tải 78/78 |

**Một ca lý thuyết agent ghi lại.** Nếu backend chết, sau khi đã khởi động lại, trong lúc khôi phục, thì hộp thoại "lỗi khi đang chạy" hiện ra, còn hộp thoại `restore_failed` (có đường dẫn dữ liệu cũ) bị bỏ qua; thông điệp của nó chỉ còn trong log. Tôi xét lại:
- `onUnexpectedExit` chỉ chạy khi backend đã READY.
- Lần khởi động hỏng ở bước 8c thì không có READY.

Nên ca này cần hai việc hiếm cùng xảy ra: backend tự chết đúng trong khoảng sau READY, và một bước sau khởi động của `restore_data` hỏng. Không mở mục riêng; ghi vào DSK-30 để chặng H xét.

## 4. Những gì đã tự chạy lại

**Môi trường:** Linux, 2 lõi, Node 24, Xvfb với icewm, Electron 44.4.5. Bản sao chỉ có một chỗ vá thường lệ: `processTable()` đọc `/proc`.

| Hạng mục | Agent (Windows) | Orchestrator (Linux) | Kết quả |
|---|---|---|---|
| `npm run lint`, `tsc` | sạch | sạch | khớp |
| Rà chỉ thị trong `src`, `tests`, `configs`, tệp cấu hình | rỗng | rỗng; chỉ còn chữ trong văn xuôi checkpoint | khớp |
| Ca 6, 13, 14, K1, C1, L1 | đạt | **6/6 ×3** | đạt |
| K1, C1 lặp 5 lần | — | **10/10** | đạt |
| Toàn bộ, không tải | 78 | 68 đạt; 10 hỏng đúng tập do môi trường (8 ca `desktop_main` vì cây tiến trình Windows, 2 ca `show_inactive`) | khớp, không hồi quy |
| Toàn bộ, **có tải** (2 tiến trình vòng lặp bận trên 2 lõi), 3 lượt liền nhau | — | 61, 61, 68 đạt. Ngoài tập do môi trường, chỉ N7 hỏng ở lượt 1 và 2 (§5.3). Ca 6, 14, K1, C1, U1–U6, A5 đạt cả 3 lượt | xem §5.1, §5.3 |
| Thư mục tạm `/tmp/ct-*` quanh một lượt toàn bộ | trước = sau ở mọi lượt đạt | 468 → 483: tăng 15, đúng bằng số thư mục của 9 ca hỏng do môi trường (giữ theo thiết kế, có in đường dẫn); 6 lượt riêng của các ca đạt: 447 → 447 | đạt |
| UI e2e với Desktop mới | 83 | **83**, `UI/evidence` không đổi (băm trước và sau) | khớp |

Chỉ chạy được trên Windows, Orchestrator dựa vào số của agent: `dist`, `test:packaged` 11/11, mốc `%APPDATA%`, số thư mục trong `%TEMP%`.

**Phép cắn:**

| Phép cắn | Ai chạy | Ca hỏng |
|---|---|---|
| (a) bỏ cờ chặn | agent; Orchestrator (lặp 3 lần) | K1 (3/3); 6, 13, 14 đạt |
| (b) đảo điều kiện | agent; Orchestrator | 6, 13, 14, K1 |
| (c) lần bị bỏ qua vẫn ghi `FATAL:` | agent; Orchestrator | K1; ca 14 đạt (§5.2) |
| (d) bỏ dòng `fatalReported = true`, chỉ còn `shutdownStarted` chặn | Orchestrator | **không ca nào** (§5.4) |

Ghi chú về phép (b): ứng dụng không bao giờ thoát, nên để lại tiến trình Electron và backend giả. Tôi dừng chúng bằng tay. Chúng làm ca kiểm cuối tệp (`afterAll`: không còn tiến trình python) của lượt chạy kế tiếp báo hỏng một lần. Lượt sau khi dọn thì đạt.

## 5. Phát hiện

### 5.1 Tiêu chí 4: không có ba lượt có tải liền nhau đạt đủ (chấp nhận; DSK-30)

**Agent đo được:**
- 11 tiến trình tải, cộng một tiến trình `python -` mồ côi do chính agent để lại, quay 100% một lõi: 71/78.
  - Hỏng: ca 6 và 14 "process did not exit within 60000 ms"; A3b, A4, A6 hết 120 s; ca 15 và 16 của `show_inactive`.
- 4 tiến trình, sau khi dừng tiến trình mồ côi:
  - một lượt 76/78 (24 phút): ca 6 hỏng vì backend giả chết trước khi cửa sổ mở; ca 14 "did not exit within 60000 ms";
  - buổi chiều 78, 78, 78, nhưng không liền nhau vì có một lượt máy treo bị bỏ;
  - lượt cuối 76/78: chỉ hỏng ca 15 và 16 của `show_inactive`.
- 7 tiến trình: 78, 78, 74 (A2, A4, A6, ca 15, đều hết 120 s).

**Vì sao chấp nhận:**
1. Phần đổi ở Main chỉ thêm một nhánh `return` sớm. Nhánh đó bỏ một hộp thoại và một lần gọi `shutdown()` vốn trả về ngay vì cờ đã đặt. Nó không thêm lần chờ nào, nên không thể làm ứng dụng chậm thoát.
2. Các kiểu hỏng gồm hết 120 s, hết 60 s, và đo tiêu điểm (ca 15, 16 phụ thuộc người dùng chuyển cửa sổ). Đều là chỗ nhạy của kiểm thử. Chúng có trước phiên này; phiên 38 đã thấy cùng loại.
3. Trên Linux có tải (§4), ca 6, 14, K1, C1 đạt cả ba lượt.

**Chưa loại trừ hoàn toàn:** ca 14 "process did not exit within 60000 ms" có thể là chậm thật do máy quá tải (lượt đó chậm 4 lần so với bình thường), hoặc một lần treo thật lúc thoát mà mã cũ đã có sẵn. Báo cáo không kèm log của lần đó. **Việc (DSK-30):** lần sau gặp lại thì giữ và đọc log, xem dòng cuối cùng Main ghi trước khi treo.

**Ca 6 khi có tải:** ca này khẳng định có dòng `opening the window`, tức giả định cửa sổ mở trước khi backend giả chết, 2 giây sau READY. Máy chậm thì giả định đó sai, dù ứng dụng xử lý đúng: một hộp thoại, mã thoát 1. Đề xuất cho DSK-30: cho backend giả chỉ chết sau khi nhận lời gọi đầu tiên từ trang (ví dụ một `GET` của trang `probe`). Như vậy thứ tự là chắc chắn, không cần nới thời gian chờ.

### 5.2 Phép cắn (c): ca 14 không bắt được, plan của tôi sai

Plan ghi "ca tái hiện và ca 14 hỏng". Ca 14 dùng trang `probe`, nạp xong rất nhanh, nên không bao giờ có lần gọi `fatal()` thứ hai; nó chỉ bắt được phép (c) khi máy tải làm lần gọi thứ hai xuất hiện. K1 bắt được phép (c) ổn định, nên độ phủ đủ. Agent làm đúng khi không tự đổi ca 14. Lỗi ở plan, không phải ở agent.

### 5.3 N7 hỏng khi có tải trên Linux: chỗ đua của kiểm thử, có từ trước (DSK-30)

`native_dialogs.spec.ts` N7 hỏng ở 2/3 lượt có tải của tôi, với lỗi "page.evaluate: Execution context was destroyed, most likely because of a navigation", ở dòng 232. Ca này điều hướng cửa sổ sang một trang `data:` rồi gọi `evaluate` ngay, chưa chờ trang mới nạp xong. Đúng kiểu chỗ đua R10 của `restore_data.spec.ts` đã được sửa ở phiên 38 ("chờ trang `data:` nạp xong rồi mới `evaluate`"). Phiên này không đổi N7, chỉ thêm import và một dòng gọi dọn thư mục ở đầu tệp. Agent không thấy nó trên Windows. **Việc (DSK-30):** sửa như R10.

### 5.4 Cờ `fatalReported` không có kiểm thử nào phủ (ghi nhận, không phải lỗi)

Phép cắn (d) của tôi bỏ dòng đặt cờ: không ca nào hỏng. Lý do:
- Khi chạy kiểm thử (`--ct-test-no-dialog`), không có hộp thoại chặn luồng.
- `fatal()` gọi `shutdown()` ngay, và `shutdown()` đặt `shutdownStarted` một cách đồng bộ.
- Vì vậy nhánh `shutdownStarted` đã đủ chặn mọi lần gọi sau.

`fatalReported` chỉ có tác dụng trong lúc một hộp thoại thật đang mở: đó đúng là chỗ plan yêu cầu đặt cờ trước, vì không ai nắm chắc trong lúc đó có callback nào chạy không. Không kiểm thử tự động được nếu không thêm cờ kiểm thử, mà plan cấm thêm. Chấp nhận; lý do đã ghi ở EXP-039.

### 5.5 Thư mục tạm còn lại trên máy Project Owner

`%TEMP%` của Project Owner có khoảng 2130 thư mục `ct-desktop-*`, tích lại từ các phiên trước, cộng vài chục thư mục của các lượt hỏng hoặc bị bỏ trong phiên này. Kiểm thử không xóa chúng (đúng thiết kế: không quét theo tiền tố). Project Owner có thể xóa tay `%TEMP%\ct-desktop-*` khi không có lượt kiểm thử nào đang chạy; việc này an toàn và không bắt buộc.

## 6. Trạng thái

- DSK-28, DSK-29 đóng ngày 2026-10-11, phiên 39.
- Mở **DSK-30** (thấp; chặng H, hoặc phiên desktop kế tiếp của chặng G): độ ổn định của kiểm thử Desktop khi có tải. Gồm: N7 chờ trang `data:`; ca 6 không dựa vào thứ tự thời gian; đọc log nếu ca 14 lại "did not exit"; ca lý thuyết `restore_failed` bị che (§3); ca 15, 16 của `show_inactive` phụ thuộc người dùng, nên chặng H chạy khi Project Owner không dùng máy.
- Chặng G tiếp theo: runbook ENV-4 + DSK-21. Orchestrator cần xác định trước phần nào phải sửa mã (số phiên bản; dựng dữ liệu cần nâng cấp cấu trúc cho tiêu chí 4 của DSK-21).
- Hợp đồng không đổi.

## 7. Commit

```
git add Desktop
git commit -m "CAS39 - Desktop: DSK-28 single error dialog, DSK-29 temp folders, eslint-disable removed"
git add .reviews/audits/desktop/audit_desktop_session39.md .plan/open_issues.md .plan/v1_roadmap.md CLAUDE.md
git commit -m "OS - Audit session 39; DSK-28, DSK-29 closed; DSK-30"
git push
```
