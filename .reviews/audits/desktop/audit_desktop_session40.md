# Audit phiên 40 — desktop, chặng G: G-VER 1.0.0, DSK-30 mục 1 và 2

- Orchestrator, 2026-10-11.
- Plan: `.plan/desktop_plan.md` (phiên 40). Hợp đồng: Data Schema 10.0.1, API Contract 5.0.0, không đổi.
- Mã kiểm: bản trên đĩa của Project Owner lúc 2026-10-11 15:53 (chưa commit), đặt lên `HEAD = 80188d7`. Đổi 6 tệp và thêm 1 tệp, đều trong `Desktop/`. Khớp với báo cáo của agent.

## 1. Kết luận

**Đạt.** Cả ba việc đúng plan; mọi tiêu chí hoàn tất đạt.

- **G-VER:** ứng dụng là `1.0.0`. Số phiên bản đi từ `package.json` tới backend mà không chỗ nào gõ cứng. Hai ca mới ràng hai đầu với nhau: V1 (backend thật) và P12 (bản đóng gói).
- **N7:** đã sửa đúng chỗ đua. Trên Linux có tải, khi bỏ bước chờ thì N7 hỏng **5/5**; khi giữ bước chờ thì đạt **5/5**, và đạt cả ba lượt toàn bộ có tải. Đây là bằng chứng tái hiện mà agent không lấy được trên Windows.
- **Ca 6 và ca 14:** backend giả mới chỉ chết khi nhận lời gọi đầu tiên, nên hai ca không còn phụ thuộc máy nhanh hay chậm. Mọi khẳng định cũ giữ nguyên.
- **Bộ cài `1.0.0`** đã dựng: 116 853 427 byte, SHA-256 `C776FB0E…A31E982`. Bộ cài `0.1.0` được Project Owner chép ra `E:\installer\` (SHA-256 `9430d080…a01d0`). Runbook chặng G có đủ hai bản.

Có ba điểm cần biết, không chặn commit (§5):
1. Lượt có tải đầu tiên của agent hỏng 6 ca và bị bỏ. Agent ghi thật trong EVIDENCE.
2. Log của ca "did not exit" vẫn không giữ được.
3. `npm ci` làm mất tệp chạy Electron trên máy Project Owner.

## 2. Tệp thay đổi

| Tệp | Nội dung |
|---|---|
| `package.json`, `package-lock.json` | `0.1.0` → `1.0.0`, đúng ba dòng, bằng `npm version 1.0.0 --no-git-tag-version` |
| `src/main.ts` | Chỉ khối checkpoint: sửa câu hiện trạng dòng 22; EXP-041, EXP-042; bốn mục EVIDENCE. Mã không đổi (tôi so phần sau khối checkpoint: giống hệt) |
| `tests/desktop_main.spec.ts` | Ca 6 và 14 dùng `fake_backend_die_on_first_call.py`; thêm V1 |
| `tests/native_dialogs.spec.ts` | N7: `await expect(page.locator('p')).toHaveText('other')` sau `loadURL`, như R10 |
| `tests/packaged/packaged_app.spec.ts` | Thêm P12 |
| `tests/fixtures/fake_backend_die_on_first_call.py` (mới) | Lắng nghe `CT_PORT`, in READY, thoát mã 3 khi đọc xong dòng yêu cầu `http` đầu tiên, không trả lời |

Với `core.ignorecase=true`, `git check-ignore` không bỏ qua tệp mới. Lint sạch. Rà toàn bộ `Desktop/`: không có `eslint-disable` hay `@ts-*`.

## 3. Đối chiếu với plan

| Yêu cầu | Kết quả |
|---|---|
| `package.json`, `package-lock.json` = `1.0.0`; `npm ci` đúng | Đúng |
| Không sửa `UI/package.json`, `electron-builder.yml` | Đúng |
| Ca ràng phiên bản, đọc `package.json` lúc chạy, với backend thật | V1 và P12, so cả `app.getVersion()` lẫn `app_version` của `POST /backups` |
| Chuỗi `'0.1.0'` trong dữ liệu giả | Giữ nguyên; không ca nào hỏng vì nó |
| N7 chờ như R10; rà các chỗ khác | Đúng; EXP-042 liệt kê các chỗ đã rà, không còn chỗ nào khác |
| Backend giả mới; ca 6, 14 giữ khẳng định; K1 không đổi | Đúng |
| Ba phép cắn | (a), (b) bắt được; (c) không tái hiện trên Windows (tôi tái hiện được trên Linux, §4) |
| 3 lượt có tải + 1 không tải; N7, 6, 14, K1, C1 đạt cả 4 | Agent: 79, 79, 79, 79. Tôi (Linux): N7, 6, 14, K1, C1, V1 đạt cả 4 lượt |
| `dist`, `test:packaged`, UI e2e | Bộ cài `1.0.0`; `test:packaged` 12/12; e2e 83 |
| Checkpoint: YAML, BE-8, `UNSOLVED_PROBLEMS: []` | Đúng |
| Mốc `%APPDATA%` | Giống đầu phiên (agent) |

**Trên Linux, lời gọi giết backend giả là `GET /clients` của trang `probe`.** Agent đo trên Windows thì là `POST /reminders/checks` của ticker. Hai trường hợp đều đến sau khi cửa sổ đã mở, nên không ảnh hưởng.

## 4. Những gì đã tự chạy lại

**Môi trường:** Linux, 2 lõi, Node 24, Xvfb với icewm, Electron 44.4.5. Bản sao chỉ có chỗ vá thường lệ: `processTable()` đọc `/proc`.

| Hạng mục | Agent (Windows) | Orchestrator (Linux) | Kết quả |
|---|---|---|---|
| `npm run lint`, `tsc` | sạch | sạch | khớp |
| Ca 6, 14, K1, C1, V1, N7 | đạt | **6/6 ×3** | đạt |
| Toàn bộ, không tải | 79 | 69 đạt; 10 hỏng đúng tập do môi trường (8 ca `desktop_main` vì cây tiến trình Windows, 2 ca `show_inactive`). V1 đạt | khớp, không hồi quy |
| Toàn bộ, **có tải** (2 tiến trình vòng lặp bận / 2 lõi), 3 lượt liền nhau | 79, 79, 79 | **69, 69, 69**: chỉ đúng 10 ca do môi trường. N7 đạt cả ba lượt (phiên 39: hỏng 2/3) | đạt |
| Thư mục tạm quanh lượt không tải | — | 532 → 547: tăng 15, đúng bằng số thư mục của các ca hỏng do môi trường (giữ theo thiết kế) | đạt |
| UI e2e với Desktop mới | 83 | **83**, `UI/evidence` không đổi (băm trước và sau) | khớp |

Chỉ chạy được trên Windows, Orchestrator dựa vào số của agent: `dist`, `test:packaged` 12/12, SHA-256 của hai bộ cài, mốc `%APPDATA%`.

**Phép cắn:**

| Phép cắn | Ai chạy | Kết quả |
|---|---|---|
| (a) backend giả thoát ngay sau READY | agent | ca 6 hỏng ở `opening the window` |
| (a) như trên | Orchestrator | ca 6, 14 **đạt** (§5.4) |
| (b) `CT_APP_VERSION` gõ cứng `'0.1.0'` | agent; Orchestrator | V1 hỏng |
| (c) bỏ bước chờ của N7, 5 lượt có tải | agent | 0/5 hỏng |
| (c) như trên | Orchestrator | **5/5 hỏng**; giữ bước chờ: 5/5 đạt |

## 5. Phát hiện

### 5.1 Lượt có tải đầu tiên hỏng 6 ca và bị bỏ (ghi nhận)

Lượt có tải đầu tiên của agent chạy từ một tiến trình PowerShell ẩn, cho 73 đạt, 6 hỏng:
- ca 1: `#done` vẫn ẩn sau 60 s;
- ca 6 và 14: "process did not exit within 60000 ms";
- A2, A4, A6: hết 120 s.

Mỗi ca mất 40–80 giây, trong khi bình thường chỉ vài giây. Agent dừng lượt đó. Chạy lại ca 1, 6, 14 cả từ shell thường lẫn từ launcher ẩn, có tải và không tải, đều đạt. Ba lượt có tải sau đó đạt cả 79/79.

Đánh giá của tôi: đây là máy bị nghẽn, không phải lỗi mã. Ca 1 dùng backend thật và không liên quan tới phần sửa của phiên này, nhưng cũng hỏng theo cùng kiểu. Lúc đó có một lệnh `Get-ChildItem -Recurse` của chính agent quét `E:\`, `%TEMP%` và `%USERPROFILE%` trong khi antivirus đang bật. Việc bỏ một lượt hỏng rồi chạy lại ba lượt mới là chấp nhận được, vì agent ghi thật và có chạy lại riêng các ca hỏng. Nhưng từ nay plan sẽ nói rõ: **lượt hỏng vẫn được tính**, và mọi lượt đều phải báo.

### 5.2 Log của ca "did not exit" vẫn không giữ được (DSK-30 mục 3, cập nhật)

DSK-30 mục 3 yêu cầu giữ log khi ca 14 lại báo "did not exit". Agent không giữ được: các ca dùng `spawnMain` chỉ in `run.log.text` **sau khi** `waitForExit` trả về, nên khi chờ hết giờ thì log mất. Đây là chỗ hở của chính kiểm thử, không phải lỗi của agent.

EVIDENCE còn ghi một chi tiết quan trọng: khi hỏng, **tiến trình python giả của ca vẫn còn sống**. Ở phiên 39, ca 6 và 14 dùng `fake_backend_ready_then_die.py`, vốn tự thoát sau 2 giây. Nếu nó còn sống thì nhiều khả năng python chưa từng chạy tới READY, ví dụ bị antivirus giữ lúc khởi động. Đó là môi trường, không phải lỗi `fatal()`.

**Việc (DSK-30 mục 3, sửa lại):** ca dùng `spawnMain` phải in log của Main khi ca hỏng, kể cả khi hỏng vì hết giờ chờ (ví dụ in trong `afterEach` khi ca hỏng).

### 5.3 Backend giả mới có thể treo nếu kết nối đầu tiên không gửi gì (thấp; DSK-30)

`fake_backend_die_on_first_call.py` nhận **một** kết nối rồi `recv` trên đó cho tới khi có dòng yêu cầu. Nếu kết nối đó đóng thì nó nhận kết nối kế tiếp; điểm này đúng. Nhưng nếu Chromium mở sẵn một kết nối mà **không gửi gì và không đóng** (kết nối dự phòng), còn lời gọi thật đi qua một kết nối thứ hai, thì `recv` chờ mãi. Backend không chết, và ca báo "did not exit". Chú thích trong tệp có nhắc chuyện Chromium mở sẵn socket, nhưng mã chỉ xử lý trường hợp kết nối bị đóng.

Tôi **chưa thấy** điều này xảy ra: trên Linux ca 6 và 14 đạt mọi lượt, trên Windows cũng vậy. Theo những gì tôi biết, Chromium có thể mở kết nối trước, nhưng tôi không chắc nó làm vậy với `fetch` từ `app://` tới `127.0.0.1`. **Việc (DSK-30):** cho backend giả theo dõi mọi kết nối cùng lúc (ví dụ dùng `selectors`), và chết khi bất kỳ kết nối nào có dòng yêu cầu.

### 5.4 Phép cắn (a) không bắt được trên Linux (ghi nhận)

Với backend giả thoát ngay sau READY, ca 6 vẫn đạt trên Linux, vì Main ghi dòng `opening the window` trước khi kịp xử lý việc backend chết. Như vậy khẳng định `opening the window` không thật sự chứng minh thứ tự. Thứ tự được đảm bảo bởi chính cách backend giả mới hoạt động, không bởi khẳng định. **Đề xuất (DSK-30):** ca 6 khẳng định thêm dòng stderr "fake backend: first call received" của backend giả. Dòng đó chứng minh trực tiếp rằng backend chết sau một lời gọi thật.

### 5.5 `npm ci` làm mất tệp chạy Electron (ENV-10, thấp)

Trên máy Project Owner, sau `npm ci`, thư mục `node_modules/electron/dist` biến mất, và bước cài sau của gói `electron` không tải lại. Agent chạy `node node_modules\electron\install.js`, lấy từ bộ nhớ đệm, rồi mới chạy được `npm test`. Tôi **chưa rõ nguyên nhân**: có thể biến môi trường `ELECTRON_SKIP_BINARY_DOWNLOAD`, mạng bị chặn, hay antivirus giữ tệp tải về. Trên Linux tôi không gặp, vì không chạy lại `npm ci`. **Việc:** Project Owner xem biến môi trường đó trên máy (`echo $env:ELECTRON_SKIP_BINARY_DOWNLOAD`), rồi tùy kết quả mà ghi cách chạy vào `CLAUDE.md`, hoặc tìm nguyên nhân.

## 6. Trạng thái

- G-VER xong: bản chính thức V1 là `1.0.0`. Bộ cài `1.0.0` nằm ở `Desktop\release\`; bộ cài `0.1.0` ở `E:\installer\`.
- DSK-30: mục 1 và 2 đóng ngày 2026-10-11, phiên 40. Mục 3 được sửa lại theo §5.2. Thêm mục 6 (§5.3) và mục 7 (§5.4). Mục 4, 5 giữ nguyên. DSK-30 vẫn mở, mức thấp, thuộc chặng H.
- Mở ENV-10 (thấp).
- Chặng G tiếp theo: phiên backend (BE-11, kèm BE-9 và BE-10), và runbook Project Owner chạy tay (DSK-21 tiêu chí 2, 3, 5; ENV-4). Hai việc không phụ thuộc nhau.
- Hợp đồng không đổi.

## 7. Commit

```
git add Desktop
git commit -m "CAS40 - Desktop: version 1.0.0, N7 waits for data: page, die-on-first-call fake backend"
git add .reviews/audits/desktop/audit_desktop_session40.md .plan/open_issues.md .plan/v1_roadmap.md CLAUDE.md
git commit -m "OS - Audit session 40; DSK-30 items 1-2 closed; ENV-10"
git push
```
