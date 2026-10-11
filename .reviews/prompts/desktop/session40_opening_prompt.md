Bạn là coding agent của dự án Commission Tracker, phiên theo layer `desktop`, phiên số 40 của dự án. Định danh phiên là `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác. Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/desktop_plan.md`. Đây là phiên ngắn của chặng G, gồm ba việc:
  - **G-VER:** số phiên bản ứng dụng thành `1.0.0`, kèm một kiểm thử ràng `package.json` với `app_version` mà backend nhận;
  - **DSK-30 (1):** N7 chờ trang `data:` nạp xong rồi mới `evaluate`;
  - **DSK-30 (2):** ca 6 và ca 14 dùng một backend giả chết khi nhận lời gọi đầu tiên, để không phụ thuộc thứ tự thời gian.
- Mọi tệp bạn tạo hoặc sửa nằm trong `Desktop/`. Được **chạy**, nhưng không sửa, `Backend/` và `UI/`. Script làm máy tải nằm ngoài dự án.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`10.0.1`** và API Contract **`5.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

2. Làm việc 1 của plan:
   - môi trường;
   - trạng thái antivirus, và hôm nay đã có phiên coding agent nào chạy chưa (hỏi tôi);
   - **hỏi tôi đã chép bộ cài `release\Commission Tracker Setup 0.1.0.exe` ra ngoài `Desktop\` chưa**; chưa thì chờ;
   - mốc `lint` và `npm test` (78);
   - mốc `%APPDATA%`;
   - `git status --short`.

   Trước dòng code đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - các mốc;
   - những chỗ đang dùng số phiên bản (`package.json`, `package-lock.json`, `app.getVersion()`, `CT_APP_VERSION`, kiểm thử);
   - ca ràng phiên bản đã có hay sẽ thêm, và ở đâu;
   - cách bạn định làm backend giả mới;
   - điểm nào trong plan hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan.

4. **Những điều không làm:**
   - Không đổi nhãn hay mã lỗi của hợp đồng. Không thêm lối vào `ipc` hay cờ `--ct-test-*`. Không thêm mã vào sản phẩm chỉ để kiểm thử.
   - Không sửa `UI/package.json`. Không xóa `fake_backend_ready_then_die.py` (K1 vẫn dùng). Không đổi K1.
   - Không thay `_electron.launch`. Không nới thời gian chờ, không `retries`, không `skip`.
   - Không xóa `release\` trước khi tôi xác nhận đã chép bộ cài `0.1.0` ra ngoài. Không cài bộ cài, không gỡ bản đã cài, không sửa registry.
   - Không tắt, không đổi cấu hình antivirus.
   - Không đụng `%APPDATA%\CommissionTracker` thật: mọi lần chạy ứng dụng đều kèm `--ct-test-data-dir`.
   - Không tắt luật lint. Không thêm `eslint-disable`, `@ts-ignore`, `@ts-expect-error` hay `@ts-nocheck`.
   - Không dùng sub-agent.
   - Phép cắn nào bị bộ phân loại quyền chặn thì ghi lại rồi đi tiếp, không tìm đường vòng.

   **Quy ước:** giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn. Nếu sửa checkpoint sau khi đã chạy toàn bộ, chạy lại `npm test` một lượt và nói rõ trong báo cáo.

5. Phiên này không cần tôi chạy tay, ngoài việc chép bộ cài `0.1.0` ở bước 2. Tôi dùng máy bình thường trong lúc kiểm thử chạy.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên máy này, với antivirus đang bật.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md` mục 5, kèm đủ các mục ở tiêu chí 10 của plan:
   - cách đổi phiên bản và ca ràng phiên bản;
   - các phép cắn;
   - số đạt của bốn lượt `npm test` (ba có tải, một không tải), tên và nguyên nhân mọi ca hỏng;
   - kích thước và SHA-256 bộ cài `1.0.0`; kết quả `test:packaged` và UI e2e;
   - các lệnh để chạy lại;
   - danh sách tệp trong `git status --short`, kèm `git check-ignore -v` cho từng tệp mới;
   - danh sách ngoại lệ lint mới (phải rỗng).
