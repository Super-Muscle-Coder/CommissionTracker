# Runbook chặng G — cài đè (DSK-21) và máy sạch (ENV-4)

*Orchestrator soạn ngày 2026-10-11. Project Owner chạy tay. Nguồn: `.plan/v1_roadmap.md` (chặng G, tiêu chí cài đè 1–5), `.plan/open_issues.md` (DSK-21, ENV-4, DSK-3), audit desktop phiên 40.*

## Mục đích

Trả lời bằng quan sát thật, trên máy Project Owner, ba câu hỏi của DSK-21:

| Tiêu chí | Câu hỏi | Phần |
|---|---|---|
| 2 | Cài `1.0.0` đè `0.1.0` khi ứng dụng **đóng**: dữ liệu còn, ứng dụng mở được, lối tắt và thông báo còn chạy? | B, E |
| 3 | Cài `1.0.0` đè `0.1.0` khi ứng dụng **đang mở**: bộ cài làm gì; có để lại bản cài nửa vời hay `python.exe` sót lại không? | D |
| 5 | Cài `0.1.0` đè `1.0.0` (bản cũ đè bản mới): bị chặn, hay chạy được mà dữ liệu không hỏng? | C |

Tiêu chí 1 (số phiên bản) xong ở phiên 40. Tiêu chí 4 không áp dụng cho bản 1.0 (thay bằng BE-11).

Rồi chạy trên một máy Windows khác (ENV-4, phần F).

**Orchestrator chưa nắm chắc** bộ cài NSIS của electron-builder làm gì khi ứng dụng đang mở, hay khi cài bản cũ đè bản mới. Vì thế runbook này **ghi lại đúng những gì thấy**, không đoán trước kết quả. Với mỗi hộp thoại lạ, chụp màn hình.

## Điều kiện và cách giữ an toàn dữ liệu

- AVG và ReasonLabs **bật** như bình thường. Không thêm ngoại lệ.
- Hai bộ cài:
  - bản cũ: `E:\installer\Commission Tracker Setup 0.1.0.exe`, SHA-256 bắt đầu bằng `9430D080`, kết thúc bằng `A01D0`;
  - bản mới: `E:\CommissionTracker\Desktop\release\Commission Tracker Setup 1.0.0.exe`, SHA-256 `C776FB0E1636FFC88130DAD4DF3BF0465634B345724DBF0520C7F7908A31E982`.
- **Mọi lần mở ứng dụng trong runbook đều dùng thư mục dữ liệu thử** `E:\ct-runbook\data`, qua cờ `--ct-test-data-dir`, trừ **một** lần mở từ Start Menu ở phần E. Lần đó dùng dữ liệu thật, nên phần A sao lưu dữ liệu thật trước.
- **Lần mở đầu của mỗi exe mới có thể mất tới khoảng 80 giây** trước khi cửa sổ hiện (antivirus giữ exe chưa ký, DSK-3). Đó là chuyện đã biết. Cứ chờ, và ghi lại thời gian nếu bạn để ý.
- Mọi lệnh dưới đây chạy trong **PowerShell** thường (không cần quyền quản trị). Mở một cửa sổ PowerShell và dùng nó suốt runbook, vì các biến `$exe`, `$data` được dùng lại.

---

## A. Chuẩn bị

**A1. Đóng Commission Tracker** nếu đang mở.

**A2. Tạo thư mục làm việc và sao lưu dữ liệu thật:**

```powershell
New-Item -ItemType Directory -Force E:\ct-runbook\data, E:\ct-runbook\backup | Out-Null
Copy-Item "$env:APPDATA\CommissionTracker" E:\ct-runbook\backup\ -Recurse -ErrorAction SilentlyContinue
Copy-Item "$env:APPDATA\Commission Tracker" E:\ct-runbook\backup\ -Recurse -ErrorAction SilentlyContinue
Get-ChildItem E:\ct-runbook\backup -Recurse -File | Measure-Object -Property Length -Sum | Select-Object Count, Sum
```

Ghi lại `Count` và `Sum`.

**A3. Kiểm hai bộ cài:**

```powershell
Get-FileHash "E:\installer\Commission Tracker Setup 0.1.0.exe"
Get-FileHash "E:\CommissionTracker\Desktop\release\Commission Tracker Setup 1.0.0.exe"
```

Hai giá trị phải khớp với phần "Điều kiện". Không khớp thì dừng lại và báo Orchestrator.

**A4. Đặt sẵn hai lệnh kiểm tra** (dán một lần, dùng lại ở các phần sau):

```powershell
$exe  = "$env:LOCALAPPDATA\Programs\commission-tracker\Commission Tracker.exe"
$data = "E:\ct-runbook\data"
function Show-Installed {
  Get-ItemProperty HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue |
    Where-Object DisplayName -like "Commission Tracker*" | Select-Object DisplayName, DisplayVersion, InstallLocation
  if (Test-Path $exe) { "exe: " + (Get-Item $exe).VersionInfo.ProductVersion } else { "exe: KHONG CO" }
}
function Show-Leftovers {
  Get-Process "Commission Tracker" -ErrorAction SilentlyContinue | Select-Object Id, Path
  Get-Process python, pythonw -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*commission-tracker*" } | Select-Object Id, Path
  "--- het danh sach tien trinh ---"
}
```

`Show-Installed` chỉ **đọc** danh sách ứng dụng đã cài, không sửa gì. `Show-Leftovers` liệt kê tiến trình của ứng dụng và `python.exe` của ứng dụng còn chạy.

**A5. Gỡ bản đang cài, nếu có,** để bắt đầu từ trạng thái sạch:
- Chạy `Show-Installed`. Có dòng "Commission Tracker" thì gỡ ở **Settings → Apps → Installed apps → Commission Tracker → Uninstall**.
- Chạy lại `Show-Installed`: phải không còn dòng nào, và `exe: KHONG CO`.
- Bộ gỡ cố ý giữ dữ liệu, nên `%APPDATA%\CommissionTracker` vẫn còn. Đúng như thiết kế.

---

## B. Tiêu chí 2 — cài `1.0.0` đè `0.1.0` khi ứng dụng đóng

**B1. Cài `0.1.0`:**

```powershell
Start-Process "E:\installer\Commission Tracker Setup 0.1.0.exe" -Wait
Show-Installed
```

Phải thấy `DisplayVersion` là `0.1.0` và `exe: 0.1.0`. Ghi lại `InstallLocation`.

**B2. Mở `0.1.0` trên dữ liệu thử và tạo dữ liệu:**

```powershell
Start-Process $exe -ArgumentList "--ct-test-data-dir=$data"
```

Trong ứng dụng:
1. "Thêm khách hàng", tên **`Runbook A`**, "Lưu".
2. Tạo một đơn hàng cho `Runbook A`, tên **`Don runbook`**. Hạn giao để trống hoặc một ngày xa (ví dụ cuối năm), để nhắc việc không bắn trước phần E.
3. **Không** đổi cài đặt nhắc việc ở bước này.
4. Đóng cửa sổ.

Rồi chạy `Show-Leftovers`: phải chỉ in dòng `--- het danh sach tien trinh ---`.

**B3. Cài `1.0.0` đè lên** (ứng dụng đang đóng):

```powershell
Start-Process "E:\CommissionTracker\Desktop\release\Commission Tracker Setup 1.0.0.exe" -Wait
Show-Installed
```

Ghi lại:
- bộ cài có hiện gì không (chụp màn hình nếu có);
- có **đúng một** dòng "Commission Tracker", `DisplayVersion` là `1.0.0`;
- `exe: 1.0.0`;
- `InstallLocation` có giống B1 không.

**B4. Mở `1.0.0` trên cùng dữ liệu thử:**

```powershell
Start-Process $exe -ArgumentList "--ct-test-data-dir=$data"
```

Phải thấy `Runbook A` trong "Khách hàng" và `Don runbook` trong "Đơn hàng". Đóng cửa sổ, rồi chạy `Show-Leftovers` (phải sạch).

---

## C. Tiêu chí 5 — cài `0.1.0` đè `1.0.0` (bản cũ đè bản mới)

**C1. Cài bản cũ đè** (ứng dụng đang đóng):

```powershell
Start-Process "E:\installer\Commission Tracker Setup 0.1.0.exe" -Wait
Show-Installed
```

Ghi lại **đúng điều đã xảy ra**:
- bộ cài từ chối, hỏi gì đó, hay cài lặng lẽ (chụp màn hình mọi hộp thoại);
- `DisplayVersion` và `exe:` sau đó là `0.1.0` hay vẫn `1.0.0`.

**C2. Mở ứng dụng trên dữ liệu thử:**

```powershell
Start-Process $exe -ArgumentList "--ct-test-data-dir=$data"
```

Ghi lại: ứng dụng mở được, hay hiện hộp thoại lỗi (chụp màn hình). Nếu mở được, `Runbook A` và `Don runbook` còn không. Đóng cửa sổ; chạy `Show-Leftovers` (phải sạch).

*Orchestrator dự đoán, chưa chắc:* bộ cài không chặn cài bản cũ, và vì hai bản cùng cấu trúc dữ liệu nên `0.1.0` mở bình thường. Nếu đúng vậy thì tiêu chí 5 đạt ("không hỏng dữ liệu"). Nhưng runbook không dựa vào dự đoán này.

---

## D. Tiêu chí 3 — cài `1.0.0` đè `0.1.0` khi ứng dụng đang mở

**D1. Chuẩn bị:** `Show-Installed` phải cho thấy `0.1.0` (sau phần C). Nếu phần C bị chặn và máy vẫn là `1.0.0`, thì gỡ ở Settings → Apps, cài `0.1.0` như B1, rồi mới làm tiếp.

**D2. Mở `0.1.0` và để nguyên:**

```powershell
Start-Process $exe -ArgumentList "--ct-test-data-dir=$data"
```

Chờ thấy trang "Khách hàng" có `Runbook A`. **Không đóng cửa sổ.** Chạy `Show-Leftovers`: phải thấy tiến trình "Commission Tracker" và ít nhất một `python` trong thư mục cài. Chụp lại kết quả lệnh.

**D3. Chạy bộ cài `1.0.0` trong lúc ứng dụng đang mở:**

```powershell
Start-Process "E:\CommissionTracker\Desktop\release\Commission Tracker Setup 1.0.0.exe" -Wait
```

**Quan sát kỹ và ghi lại:**
- bộ cài có hiện hộp thoại không, chữ gì (chụp màn hình), và bạn bấm gì;
- cửa sổ ứng dụng có tự đóng không;
- bộ cài kết thúc bình thường, hay báo lỗi.

**D4. Ngay sau khi bộ cài xong:**

```powershell
Show-Leftovers
Show-Installed
```

Ghi lại:
- còn tiến trình "Commission Tracker" hay `python` nào trong thư mục cài không (phải **không còn**);
- có đúng một dòng, `DisplayVersion` `1.0.0`, `exe: 1.0.0`.

**D5. Mở `1.0.0` trên dữ liệu thử:**

```powershell
Start-Process $exe -ArgumentList "--ct-test-data-dir=$data"
```

Phải mở được, có `Runbook A` và `Don runbook`. Đóng cửa sổ; chạy `Show-Leftovers` (phải sạch).

---

## E. Tiêu chí 2 (phần còn lại) — thông báo Windows và lối tắt Start Menu

**E1. Thông báo:** máy đang là `1.0.0`.

```powershell
Start-Process $exe -ArgumentList "--ct-test-data-dir=$data"
```

Trong ứng dụng:
1. Tạo một đơn hàng mới cho `Runbook A`, tên **`Don thong bao`**, hạn giao là **hôm nay**.
2. Vào "Nhắc việc" → "Cài đặt nhắc việc", **bật** nhắc hạn giao "1 ngày trước", "Lưu".
3. Để nguyên cửa sổ và chờ. Bộ nhắc việc kiểm mỗi phút một lần, nên trong khoảng **một phút** phải hiện thông báo Windows "Sắp tới hạn giao: Don thong bao".
4. Bấm vào thông báo: cửa sổ ứng dụng phải được đưa lên trước.

Ghi lại có thông báo không, và chụp màn hình. Đóng cửa sổ.

Không thấy thông báo thì kiểm Focus Assist hay "Do not disturb" của Windows có đang bật không, rồi ghi lại.

**E2. Lối tắt Start Menu** (lần duy nhất dùng dữ liệu thật):
1. Mở Start, gõ "Commission Tracker", mở ứng dụng.
2. Phải mở được và thấy dữ liệu thật của bạn (những gì bạn đã nhập trước đây, nếu có).
3. Đóng cửa sổ, rồi chạy `Show-Leftovers` (phải sạch).

**E3. Dữ liệu thật còn nguyên:**

```powershell
Get-ChildItem "$env:APPDATA\CommissionTracker" -File | Select-Object Name, Length, LastWriteTime
```

`data.db` phải còn. Bản sao lưu ở `E:\ct-runbook\backup` giữ nguyên tới khi Orchestrator đọc xong kết quả.

**E4. Để nguyên bản `1.0.0` đã cài.** Đó là bản bạn dùng từ nay. Thư mục `E:\ct-runbook\data` có thể xóa sau khi gửi kết quả.

---

## F. ENV-4 — máy Windows khác (máy sạch)

Thay cho phần ENV-4 của `.reviews/runbooks/env4_env5_runbook.md`; các bước giữ nguyên, chỉ đổi bộ cài.

**Mang theo:** `Commission Tracker Setup 1.0.0.exe` (116 853 427 byte, SHA-256 ở trên).

**Trên máy đó, lần lượt:**
1. Ghi lại phiên bản Windows (Settings → System → About), và phần mềm antivirus đang chạy.
2. Kiểm SHA-256 của bộ cài bằng `Get-FileHash`, so với giá trị ở trên.
3. Chạy bộ cài. Exe chưa ký số nên Windows SmartScreen **có thể** hiện "Windows protected your PC": bấm "More info", rồi "Run anyway". Ghi lại có gặp màn hình này không.
4. Mở "Commission Tracker" từ Start Menu. **Bấm giờ** từ lúc bấm mở tới lúc thấy trang "Khách hàng" với dòng "Chưa có khách hàng nào.".
5. "Thêm khách hàng", nhập một tên, "Lưu". Phải thấy trang chi tiết với "Đã thêm khách hàng.".
6. Đóng ứng dụng, mở lại, bấm giờ lần hai. Khách vừa thêm phải còn trong danh sách.
7. Có hộp thoại lỗi bất kỳ thì chụp màn hình.
8. Dọn dẹp, nếu chủ máy muốn: gỡ ở Settings → Apps, rồi xóa `%APPDATA%\CommissionTracker` và `%APPDATA%\Commission Tracker`, vì bộ gỡ cố ý giữ dữ liệu.

Phần F không cần làm cùng ngày với A–E.

---

## Gửi lại Orchestrator

Chép bảng này, điền, rồi gửi kèm các ảnh chụp:

| Mục | Kết quả |
|---|---|
| A2: số tệp và tổng byte của bản sao lưu | |
| A3: hai SHA-256 khớp? | |
| A5: có gỡ bản cũ không; bản nào | |
| B1: phiên bản và `InstallLocation` | |
| B3: bộ cài hiện gì; số dòng; `DisplayVersion`; `exe:`; `InstallLocation` giống B1? | |
| B4: mở được? có `Runbook A`, `Don runbook`? | |
| C1: bộ cài làm gì (ảnh); phiên bản sau đó | |
| C2: mở được hay lỗi (ảnh); dữ liệu còn? | |
| D2: `Show-Leftovers` lúc ứng dụng đang mở | |
| D3: bộ cài hiện gì (ảnh), bạn bấm gì; cửa sổ có tự đóng? | |
| D4: còn tiến trình nào? phiên bản sau đó | |
| D5: mở được? dữ liệu còn? | |
| E1: có thông báo không (ảnh); bấm vào có đưa cửa sổ lên không | |
| E2: lối tắt Start Menu mở được? | |
| E3: `data.db` còn? | |
| Thời gian chờ lần mở đầu của mỗi exe mới (nếu để ý) | |
| F (khi làm): phiên bản Windows, antivirus, SmartScreen, hai thời gian mở, bước 5–6 | |

## Chốt sổ

- **Tiêu chí 2 đạt** khi B3, B4, E1, E2, E3 đúng như mô tả.
- **Tiêu chí 3 đạt** khi D4 không còn tiến trình nào, phiên bản là `1.0.0`, và D5 mở được với dữ liệu còn nguyên. Bộ cài báo cho bạn đóng ứng dụng hay tự đóng thì đều chấp nhận được. Nếu còn `python.exe` sót lại, hoặc bản cài nửa vời, thì cần một phiên desktop sửa mã.
- **Tiêu chí 5 đạt** khi C1 bị chặn, **hoặc** C2 mở được với dữ liệu còn nguyên, **hoặc** C2 hiện một hộp thoại tiếng Việt rõ ràng và dữ liệu thử không hỏng (D5 vẫn mở được).
- **ENV-4 đóng** khi các bước 4–6 của phần F đạt trên máy khác.
- **DSK-21 đóng** khi tiêu chí 2, 3, 5 đạt (tiêu chí 1 xong ở phiên 40; tiêu chí 4 thay bằng BE-11).

---

## Kết quả — Project Owner chạy ngày 2026-10-11, 19:20–19:55 (Orchestrator đọc log và hỏi lại)

**Nguồn:** log PowerShell đầy đủ Project Owner gửi, ảnh hộp thoại ở D3, và câu trả lời của Project Owner cho bốn câu hỏi của Orchestrator (20:00). AVG và ReasonLabs bật.

| Mục | Kết quả |
|---|---|
| A2 | Sao lưu 69 tệp, 8 161 167 byte (2 tệp của `CommissionTracker`, 67 của `Commission Tracker`) |
| A3 | Hai SHA-256 khớp: `9430D080…577A01D0` (0.1.0) và `C776FB0E…A31E982` (1.0.0) |
| A5 | Không chạy `Show-Installed` trước B1, nên không biết có bản cũ hay không. Không ảnh hưởng kết luận: sau B1 chỉ có đúng một dòng `0.1.0` |
| B1 | `Commission Tracker 0.1.0`, `exe: 0.1.0.0`. `InstallLocation` để trống trong registry (electron-builder không ghi); exe ở `C:\Users\A\AppData\Local\Programs\commission-tracker\` |
| B3 | Bộ cài không hiện gì. Đúng một dòng `Commission Tracker 1.0.0`, `exe: 1.0.0.0` |
| B4 | Mở được; `Runbook A` và `Don runbook` còn (Project Owner xác nhận) |
| C1 | Bộ cài **không chặn**, cài lặng lẽ; sau đó `0.1.0`, `exe: 0.1.0.0` |
| C2 | Mở được; dữ liệu còn (Project Owner xác nhận). Hai bản dùng cùng cấu trúc dữ liệu, nên đúng như dự đoán |
| D2 | `Show-Leftovers` lúc `0.1.0` đang mở: bốn tiến trình `Commission Tracker.exe` (tiến trình chính và các tiến trình con của Electron), một `python.exe` trong thư mục cài, và một tiến trình id 800 không đọc được đường dẫn (§K2) |
| D3 | Hộp thoại của bộ cài: "Commission Tracker is running. Click OK to close it. If it doesn't close, try closing it manually." Project Owner bấm OK: ứng dụng **tự đóng**, bộ cài chạy tiếp tới xong |
| D4 | **Không còn tiến trình nào**; `1.0.0`, `exe: 1.0.0.0` |
| D5 | Mở được; dữ liệu còn |
| E1 | Log: `reminder check #1: 1 notification(s)`, toast "Sắp tới hạn giao: Don thong bao" `show`, rồi `click (window brought to the front: true)` |
| E2 | Lối tắt Start Menu mở được, đúng dữ liệu thật, không lỗi (Project Owner xác nhận) |
| E3 | `data.db` 114 688 byte và `data.db.lock` còn, giờ ghi 2026-09-28 21:09:42, giống trước runbook |
| F | Chưa làm |

### K1. Lần mở đầu của mỗi exe mới: một bản chạy ẩn khoảng 25 giây trước bản thật

Bốn lần mở đầu sau một lần cài (B2, B4, C2, D5), log đều có **hai** tiến trình Main nối nhau, cùng đối số, cùng tiến trình cha (PowerShell):
1. **Bản thứ nhất** in đủ các dòng khởi động: backend READY, `opening the window`. Nó còn in `Failed to find real location of …\resources\python\python.exe`, một dòng **chỉ** xuất hiện ở bản này.
2. Khoảng 25 giây sau, ở B4, C2, D5, bản thứ nhất ghi `Failed to open persistent cache files … being used by another process`, rồi `backend (pid …) exited with code 0`, rồi `FATAL: The backend stopped unexpectedly (exit code 0)`. Ở B2 log của nó dừng ngay sau `opening the window`.
3. **Bản thứ hai** khởi động ngay sau đó, không có dòng `Failed to find real location`, và chạy bình thường tới khi đóng.

Project Owner **chỉ thấy phải chờ khoảng nửa phút**: không có cửa sổ thừa, không có hộp thoại lỗi.

**Cách Orchestrator đọc** (suy luận từ log, chưa có xác nhận của antivirus):
- Bản thứ nhất chạy trong một môi trường cách ly của antivirus (AVG hoặc ReasonLabs), kiểu "chạy thử exe lạ". Dòng `Failed to find real location` khớp với hệ thống tệp bị ảo hóa. Khóa một bản ứng dụng của Electron không chặn bản thứ hai, nghĩa là hai bản không cùng một không gian. Bản này không hiện lên màn hình.
- Antivirus dừng bản đó, rồi cho bản thật chạy. Đây đúng là giả thuyết H1 của DSK-2 và DSK-3 (2026-09-27, 28), lần này có log của cả hai bản.
- **Về dữ liệu:** backend của bản thứ nhất đã thoát (19:31:56) trước khi Main thứ hai khởi động (19:31:56,7), nên hai backend không bao giờ dùng tệp dữ liệu cùng lúc. Khóa `data.db.lock` (BE-3) vẫn chặn trường hợp chồng lên nhau. Bản cách ly không làm thao tác nào của người dùng. Dữ liệu thử còn nguyên qua mọi lần.
- **Với họa sĩ:** lần mở đầu sau mỗi lần cài chậm khoảng 25–80 giây, rồi mọi thứ bình thường. Đó là DSK-3, đã biết. Cách xử lý duy nhất đã ghi là ký số (DSK-9).

### K2. Tiến trình không đọc được đường dẫn, và một tiến trình sót tạm thời

- Ở D2 có tiến trình "Commission Tracker" id 800 mà PowerShell không đọc được đường dẫn. Sau khi bộ cài đóng ứng dụng, nó cũng biến mất (D4 sạch). Nhiều khả năng đó là bản cách ly của K1, chạy ở một ngữ cảnh khác.
- Sau D5, `Show-Leftovers` thấy `Commission Tracker.exe` id 30224, không phải tiến trình chính nào có trong log, rồi ở lần chạy sau thì không còn (E3 sạch). Nhiều khả năng là tiến trình con của bản cách ly, tự thoát chậm. Không có `python.exe` nào sót lại.

### Chốt sổ

- **Tiêu chí 2 ĐẠT:** B3, B4, E1, E2, E3.
- **Tiêu chí 3 ĐẠT:** bộ cài phát hiện ứng dụng đang mở, đề nghị đóng, tự đóng khi bấm OK; không sót tiến trình, không bản cài nửa vời (D3–D5).
- **Tiêu chí 5 ĐẠT:** bộ cài không chặn bản cũ, nhưng `0.1.0` mở được trên dữ liệu của `1.0.0` mà không hỏng (C1, C2). Khi có bước nâng cấp cấu trúc thật, backend của bản cũ sẽ từ chối khởi động (đã có kiểm thử "phiên bản mới hơn thì dừng" ở từng workflow), và khi đó cần xem lại tiêu chí này.
- **DSK-21 ĐÓNG** (tiêu chí 1 ở phiên 40; tiêu chí 4 thay bằng BE-11).
- **ENV-4 còn mở** (phần F).
