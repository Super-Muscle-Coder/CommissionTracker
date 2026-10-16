Bạn là coding agent của dự án Commission Tracker. Đây là phiên theo layer `ui`, phiên số 44 của dự án. Định danh phiên có dạng `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; khi đếm, tính mọi phiên đã chạy trong ngày, kể cả phiên của layer khác. Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phiên này là một phiên kiểm độc lập** của chặng H (rà soát lại toàn bộ V1). Plan nằm ở `.plan/ui_plan.md`. Bạn kiểm xem `UI/` có theo đúng skill `iwca-implementation` v1.0 (dựng trên `wca-implementation` v2.3), đúng hợp đồng, đúng đặc tả I1 (`.design/ui_decomposition.md`) và đúng quy ước trong `CLAUDE.md` không. Phiên có hai pha; **plan hiện tại chỉ là pha 1: chỉ đọc.**

1. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan.
   - **Ở pha 1, không đọc `.plan/open_issues.md` và `.plan/v1_roadmap.md`**, để cái nhìn của bạn không bị dẫn dắt bởi phát hiện cũ.
   - Xác nhận Data Schema **`10.0.1`** và API Contract **`6.2.0`**, cả hai `approved`. Sai thì dừng lại và báo.

2. **Làm việc 1 của plan:**
   - ghi môi trường, kiểm `UI\node_modules` và `electron.exe` của Desktop;
   - ghi `git status --short` và mốc `%APPDATA%`;
   - hỏi tôi hôm nay đã có phiên coding agent nào chạy chưa, và antivirus đang ở trạng thái nào;
   - chạy `npm run check` một lượt (mốc 1936);
   - chạy `npm run build` trong `Desktop/`, rồi `npm run e2e` một lượt, **không đặt `CT_WALKTHROUGH_RUNNER`** (mốc 83); `UI/evidence/` phải không đổi.

   Báo lại cho tôi trong tối đa 8 dòng: các mốc, và cách bạn định chia việc đọc qua K1–K9. Rồi làm tiếp luôn, không cần chờ.

3. **Trả lời K1 → K9**, rồi làm phép cắn **chỉ trên bản sao** ở `%TEMP%\ct_review_ui\`, dựng đúng như việc 3 của plan:
   - mười bốn luật R1 → R14, cộng chiều ngược của R5, R7, R12, R14;
   - ít nhất năm phép cắn hành vi, đủ ba phân khu.

   Xong thì xóa đúng thư mục bản sao, gọi đích danh.

4. **Những điều không làm ở pha 1:**
   - Không sửa, không tạo, không xóa tệp nào trong kho, kể cả checkpoint, kể cả lỗi chính tả.
   - Không đặt `CT_WALKTHROUGH_RUNNER`, không chạy `walkthrough:app` hay công cụ nào ghi vào `UI/evidence/`.
   - Không chạy `npm ci`, `npm install`. Ở `Desktop/` chỉ được `npm run build`.
   - Không đọc, không ghi `.reviews/`. Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`.
   - Không chạy lệnh git nào đổi trạng thái kho.
   - Không đụng `%APPDATA%\CommissionTracker` thật.
   - Không tắt, không đổi cấu hình antivirus. Không cài thêm gói hay công cụ nào.
   - ⚠ Không thêm màn hình hồ sơ quyền sở hữu.
   - Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử.
   - Phép cắn nào bị bộ phân loại quyền chặn thì ghi lại rồi đi tiếp, không tìm đường vòng.

5. **Cuối pha 1:**
   - `git status --short` (kể cả `UI/evidence/`) và mốc `%APPDATA%` phải giống hệt đầu phiên.
   - Gửi báo cáo bằng tiếng Việt theo mục "BÁO CÁO PHA 1" của plan, đủ sáu phần, rồi **dừng và chờ**.
   - Không tự sửa gì, kể cả việc nhỏ. Pha 2 sẽ đến qua tôi, kèm plan mới.

6. Đừng tạo phát hiện cho đủ số, cũng đừng bỏ qua một điều vì nó nhỏ. Mỗi phát hiện phải có tệp, dòng, điều bị vi phạm và bằng chứng. Nếu một phát hiện cần đổi hợp đồng hay đặc tả I1 thì ghi rõ như vậy; đừng đề xuất gọi một lối vào ngoài bảng I1.
