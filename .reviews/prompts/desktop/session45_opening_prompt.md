Bạn là coding agent của dự án Commission Tracker. Đây là phiên theo layer `desktop`, phiên số 45 của dự án. Định danh phiên có dạng `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; khi đếm, tính mọi phiên đã chạy trong ngày, kể cả phiên của layer khác. Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phiên này thuộc chặng H, bước 3: dựng và kiểm bản cuối của V1.** Plan nằm ở `.plan/desktop_plan.md`. Phiên **không sửa mã sản phẩm**. Việc sửa duy nhất là dọn và cập nhật khối checkpoint của `Desktop/src/main.ts`. Việc chính là dựng lại bộ cài từ mã hiện tại rồi kiểm nó nhiều lượt.

1. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`10.0.1`** và API Contract **`6.2.0`**, cả hai `approved`. Sai thì dừng lại và báo.

2. **Trước khi chạy lệnh nào, hỏi tôi ba điều:**
   - hôm nay đã có phiên coding agent nào chạy chưa (để ghi định danh);
   - antivirus đang ở trạng thái nào;
   - tôi đã chép bộ cài `1.0.0` cũ ở `Desktop\release\` ra `E:\installer\` chưa. Chưa thì chờ: `npm run dist` sẽ ghi đè tệp đó.

3. **Làm việc 1 → 8 của plan, đúng thứ tự.** Có ba điểm dễ sai:
   - **Bộ cài cuối phải dựng từ mã cuối phiên.** Checkpoint của Main đi vào `dist/main.js`, nên sửa checkpoint sau khi dựng thì bộ cài lệch với mã. Vì vậy plan có hai lần dựng: lần 1 để kiểm nhiều lượt, lần cuối (việc 8) sau khi ghi checkpoint. SHA-256 của bộ cài chỉ ghi trong báo cáo, không ghi vào checkpoint.
   - **Kiểm Starlette trong stage:** phải là `starlette-1.3.1`. Chỉ liệt kê tên thư mục `*.dist-info`; không liệt kê và không đọc vào bên trong tệp `.asar`.
   - **E2e của giao diện, ba lượt:** mỗi lượt giữ thư mục kết quả riêng (`npm run e2e -- --output=test-results/run<N>`). Lượt nào hỏng thì giữ nguyên thư mục đó và chép log của đúng ca vào báo cáo (ENV-11).

4. **Những điều không làm:**
   - Không sửa tệp nào ngoài khối checkpoint của `Desktop/src/main.ts`.
   - Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`. Không đọc, không ghi `.reviews/`.
   - Không cài hay gỡ bộ cài, không tự mở exe bằng tay, không sửa registry.
   - Không chạy `npm ci`, `npm install`. Không chạy lệnh git nào đổi trạng thái kho.
   - Không đụng `%APPDATA%\CommissionTracker` thật.
   - Không tắt, không đổi cấu hình antivirus.
   - Không `eslint-disable`, `@ts-*`. Không nới thời gian chờ, không `retries`, `skip`.
   - Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử.
   - Lỗi nào mà việc sửa cần đổi mã sản phẩm: dừng lại và báo.

5. **Giờ checkpoint:** chép nguyên giá trị `Get-Date -Format o` lấy ngay trước khi ghi khối. Mọi lượt hỏng đều tính và phải báo; không chạy lại cho tới khi đạt.

Cuối phiên, gửi báo cáo ngắn gọn bằng tiếng Việt theo mục "BÁO CÁO" của plan, rồi dừng.
