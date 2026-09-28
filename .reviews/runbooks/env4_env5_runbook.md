# Quy trình ENV-5 và ENV-4 — Project Owner chạy tay (2026-09-28)

*Orchestrator soạn. Mục đích: đóng chặng C (`.plan/v1_roadmap.md`). Nguồn: `.plan/open_issues.md` (ENV-4, ENV-5, DSK-2, DSK-3), audit desktop phiên 14 (Q14-1).*

## ENV-5 — đo lại lần mở đầu trên máy Project Owner

**Câu hỏi cần trả lời:**
1. Hiện tượng "antivirus giữ exe mới và chạy một bản sao có backend thật" (H1) có lặp lại không? Lần này log phải được giữ lại.
2. Từ phiên 15, backend có khóa độc quyền trên tệp dữ liệu. Nếu bản sao xuất hiện, ứng dụng thật có còn mở bình thường không?
3. Nếu làm được: bên nào tạo bản sao, AVG hay ReasonLabs?

**Điều kiện:** cả AVG lẫn RAV đang bật. Vị trí cài đặt **không** có ngoại lệ; ngoại lệ chỉ áp cho `Desktop\release` và `Desktop\packaging\stage` (ENV-2).

**Bước 1 — build bản mới từ mã hiện tại** (có khóa backend của phiên 15). PowerShell:

```powershell
cd E:\CommissionTracker\Desktop
npm run dist
```

Kết thúc phải có bộ cài `release\Commission Tracker Setup 0.1.0.exe`. Nếu gặp `EPERM` ở bước đổi tên `win-unpacked.tmp`, chạy lại một lần (Q14-4).

**Bước 2 — cài đè bản mới.** Không mở ứng dụng sau khi cài, vì lần mở đầu phải do công cụ đo thực hiện.

```powershell
& ".\release\Commission Tracker Setup 0.1.0.exe"
```

Bộ cài một-cú-nhấp không tự mở ứng dụng (`runAfterFinish: false`). Đợi nó tự đóng.

**Bước 3 — tìm exe đã cài và đo 3 lượt** (lượt 1 là lần mở đầu của exe mới):

```powershell
$exe = (Get-ChildItem "$env:LOCALAPPDATA\Programs" -Recurse -Filter "Commission Tracker.exe" | Select-Object -First 1).FullName
$exe
node tests\packaged\measure_startup.cjs 3 "$exe" C-both-on
```

- Dòng `$exe` phải in ra một đường dẫn. Nếu trống, dừng lại và báo Orchestrator.
- Công cụ dùng thư mục dữ liệu tạm và không bật hộp thoại, nên **không đụng** `%APPDATA%\CommissionTracker` thật.
- Log và bản tóm tắt nằm ở `Desktop\startup-logs\C-both-on-*`. Orchestrator đọc thẳng từ máy, không cần gửi.

**Bước 4 — chỉ làm nếu lượt 1 ở bước 3 có bản sao:** trong `C-both-on-summary.json`, lượt 1 có `extra_main_instances` lớn hơn 0.

Lặp lại bước 1–3 hai lần, mỗi lần một điều kiện:
- tạm dừng **AVG** (RAV bật), nhãn `C-avg-off`;
- tạm dừng **ReasonLabs** (AVG bật), nhãn `C-rav-off`.

Bật lại antivirus ngay sau mỗi lần đo. Hạn chế đã biết: nếu antivirus nhớ kết quả quét theo nội dung exe, các lần đo sau có thể không tái hiện, vì exe mỗi lần build có thể giống hệt nhau. Nếu vậy, kết quả "không tái hiện" ở bước 4 **không** kết luận được gì. Orchestrator sẽ nói rõ khi đọc log.

**Bước 5 — dọn dẹp:** không cần gỡ cài đặt. Ứng dụng đã cài chưa từng chạy với dữ liệu thật.

## ENV-4 — chạy trên máy khác (máy của một người bạn)

**Mục đích:** tiêu chí 1 của chặng C, tức bộ cài chạy được trên một máy Windows không phải máy build.

**Mang theo:** tệp `Desktop\release\Commission Tracker Setup 0.1.0.exe` của bước 1 (khoảng 116 MB).

**Trên máy bạn, lần lượt:**
1. Ghi lại: phiên bản Windows (Settings → System → About), và phần mềm antivirus đang chạy.
2. Chạy bộ cài. Exe chưa ký số nên Windows SmartScreen **có thể** hiện "Windows protected your PC": bấm "More info" rồi "Run anyway". Ghi lại có gặp màn hình này không.
3. Sau khi cài xong, mở "Commission Tracker" từ Start menu. **Bấm giờ** từ lúc bấm mở tới lúc thấy trang "Khách hàng" với dòng "Chưa có khách hàng nào.".
4. Bấm "Thêm khách hàng", nhập một tên, bấm "Lưu". Phải thấy trang chi tiết với "Đã thêm khách hàng.".
5. Đóng ứng dụng, mở lại, và bấm giờ lần hai. Khách vừa thêm phải còn trong danh sách.
6. Nếu có hộp thoại lỗi bất kỳ, chụp màn hình.
7. Dọn dẹp, nếu bạn của bạn muốn:
   - gỡ cài đặt ở Settings → Apps;
   - xóa thư mục `%APPDATA%\CommissionTracker`, vì bộ gỡ cài đặt cố ý giữ dữ liệu.

**Gửi lại Orchestrator:** phiên bản Windows, antivirus, có gặp SmartScreen không, hai thời gian mở, kết quả bước 4 và 5, ảnh lỗi nếu có.

## Tiêu chí chốt sổ

- **ENV-5 đóng** khi có log lượt 1 của điều kiện "cả hai bật".
  - Có bản sao: H1 được xác nhận lần hai, có log gốc. Kiểm thêm ứng dụng thật vẫn mở bình thường sau khóa của phiên 15.
  - Không có bản sao: ghi nhận, vì antivirus có thể đã đổi hành vi. DSK-2 đóng với lý do: rủi ro dữ liệu đã chặn bằng khóa (BE-3), độ trễ đã có hướng xử lý (ký số, chặng G).
- **ENV-4 đóng** khi các bước 3–5 đạt trên máy khác.
- **Chặng C đóng** khi cả hai đóng.

---

## Kết quả ENV-5 — đo ngày 2026-09-28, 21:06–21:08 (Orchestrator đọc log trực tiếp)

**Nguồn:** `Desktop/startup-logs/C-both-on-run{1,2,3}.log` và `C-both-on-summary.json`. Exe: `C:\Users\A\AppData\Local\Programs\commission-tracker\Commission Tracker.exe`, SHA-256 `c9afacc2…a8396`, build từ mã có khóa backend của phiên 15. AVG và RAV đều bật; vị trí cài không có ngoại lệ.

| Lượt | Main chạy dòng code đầu | Backend READY | Cửa sổ tải xong | Thoát | Bản Main hay backend lạ |
|---|---|---|---|---|---|
| 1 (lần mở đầu của exe mới) | **+75,5 s** | +77,5 s | +79,0 s | mã 0, dừng sạch | không thấy (xem dưới) |
| 2 | +2,0 s | +3,4 s | +5,0 s | mã 0 | không |
| 3 | +1,2 s | +2,4 s | +4,1 s | mã 0 | không |

**Đọc log lượt 1:**
- Tiến trình Main được hệ điều hành tạo lúc 14:06:27Z (FILETIME trong ảnh chụp tiến trình), nhưng dòng code đầu tiên chạy lúc 14:07:42,6Z. Tức là tiến trình **bị giữ 75 s trước khi chạy**, rồi mọi thứ diễn ra bình thường trong 4 s.
- Đây là hiện tượng DSK-3 lần thứ hai, lần này có log gốc. Nó khớp giả thuyết "phần mềm bảo mật giữ exe lạ chưa ký ở lần chạy đầu". Lượt 2 và 3 cùng exe thì nhanh, vì kết quả quét đã được nhớ.
- **Điểm mù:** ảnh chụp tiến trình (mỗi 500 ms) dừng ở +15,9 s và **không bao giờ chạy lại** trong lượt 1. *Đính chính 2026-09-28, 21:12:* ban đầu Orchestrator đọc là tiến trình theo dõi "bị giữ". Project Owner gửi ảnh cảnh báo của AVG: Behavior Shield **đã chặn `powershell.exe`** với nhận dạng `IDP.HELU.PSE91 - Command line detection`. Tiến trình theo dõi của `measure_startup.cjs` chạy PowerShell với `-EncodedCommand` (một đoạn script mã hóa base64), là kiểu dòng lệnh mà phần mềm diệt virus hay coi là đáng ngờ. Lượt 2 và 3 có ảnh chụp tới cuối, vì sau đó không bị chặn nữa. Vì vậy đây là **tiến trình theo dõi bị AVG giết**, không phải bị giữ. Xem DSK-14.
- Trong 15,9 s nhìn thấy được: không có bản Main hay backend nào khác. Từ +15,9 s trở đi thì không biết, trừ những gì chính Main ghi ra.
- Nếu trong điểm mù có một bản sao chạy backend trên cùng thư mục dữ liệu, bản sao đó đã phải thoát và nhả khóa trước +75,6 s. Backend thật giành khóa ngay lần thử đầu, in `READY`, và không có dòng lỗi "database in use" nào.
- **Kết luận thực tế:** với khóa của phiên 15, lần mở đầu vẫn chậm nhưng **chạy đúng**. Không có lỗi, không có hộp thoại, dữ liệu an toàn.

**Chốt:**
- **ENV-5: ĐÓNG.**
- **DSK-2: ĐÓNG** theo tiêu chí đã ghi:
  - không quan sát được bản sao trong vùng nhìn thấy;
  - rủi ro dữ liệu đã được chặn bằng khóa (BE-3), và lần này có bằng chứng thực tế là bản thật vẫn chạy đúng;
  - nguyên nhân gốc (antivirus với exe chưa ký) để cho ký số ở chặng G.
- **DSK-3:** xác nhận lại bằng log gốc (75 s). Hướng xử lý giữ nguyên: ký số ở chặng G.
- **Bước 4 (tắt lần lượt AVG, RAV): bỏ qua**, đúng điều kiện đã ghi (chỉ làm khi thấy bản sao). Muốn biết antivirus nào giữ exe thì mỗi điều kiện cần một exe chưa từng chạy, tức là một bản build có nội dung khác. Việc đó không đáng ở V1.
- **Chặng C còn chờ ENV-4.**
