Bạn là coding agent của dự án Commission Tracker. Đây là phiên theo layer `desktop`, phiên số 43 của dự án. Định danh phiên có dạng `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; khi đếm, tính mọi phiên đã chạy trong ngày, kể cả phiên của layer khác. Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phiên này là một phiên kiểm độc lập** của chặng H (rà soát lại toàn bộ V1). Plan nằm ở `.plan/desktop_plan.md`. Bạn kiểm xem `Desktop/` có theo đúng skill `wca-implementation` v2.3, đúng hợp đồng và đúng quy ước trong `CLAUDE.md` không. Phiên có hai pha; **plan hiện tại chỉ là pha 1: chỉ đọc.**

1. **Đọc tài liệu** theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan.
   - **Ở pha 1, không đọc `.plan/open_issues.md` và `.plan/v1_roadmap.md`**, để cái nhìn của bạn không bị dẫn dắt bởi phát hiện cũ.
   - Xác nhận Data Schema **`10.0.1`** và API Contract **`6.1.0`**, cả hai `approved`. Sai thì dừng lại và báo.

2. **Làm việc 1 của plan:**
   - ghi môi trường và kiểm hai điều kiện (`electron.exe`, `UI\dist\index.html`);
   - ghi `git status --short` và mốc `%APPDATA%`;
   - hỏi tôi hôm nay đã có phiên coding agent nào chạy chưa, và antivirus đang ở trạng thái nào;
   - chạy `npm run lint`, rồi `npm test` một lượt (mốc 79), rồi `npm run test:packaged` một lượt trên bản đóng gói hiện có (mốc 12).

   Báo lại cho tôi trong tối đa 8 dòng: các mốc, và cách bạn định chia việc đọc qua K1–K8. Rồi làm tiếp luôn, không cần chờ.

3. **Trả lời K1 → K8**, rồi làm ít nhất năm phép cắn: ít nhất một ở Main, một ở `restore_data`, một ở hạ tầng cắt ngang. Phép cắn **chỉ làm trên bản sao** ở `%TEMP%\ct_review_desktop\`, dựng đúng như việc 3 của plan. Xong thì xóa đúng thư mục đó, gọi đích danh.

4. **Những điều không làm ở pha 1:**
   - Không sửa, không tạo, không xóa tệp nào trong kho, kể cả checkpoint, kể cả lỗi chính tả.
   - Không chạy `npm ci`, `npm install`, `npm run dist`, `npm start`, `npm run probe`, công cụ trong `tests/tools/`. Không build `UI/`.
   - Không đọc, không ghi `.reviews/`. Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`.
   - Không chạy lệnh git nào đổi trạng thái kho.
   - Không đụng `%APPDATA%\CommissionTracker` thật.
   - Không tắt, không đổi cấu hình antivirus. Không cài thêm gói hay công cụ nào.
   - Không dùng sub-agent. Không chạy song song hai lệnh kiểm thử.
   - Phép cắn nào bị bộ phân loại quyền chặn thì ghi lại rồi đi tiếp, không tìm đường vòng.

5. **Cuối pha 1:**
   - `git status --short` và mốc `%APPDATA%` phải giống hệt đầu phiên.
   - Gửi báo cáo bằng tiếng Việt theo mục "BÁO CÁO PHA 1" của plan, đủ sáu phần, rồi **dừng và chờ**.
   - Không tự sửa gì, kể cả việc nhỏ. Pha 2 sẽ đến qua tôi, kèm plan mới.

6. Đừng tạo phát hiện cho đủ số, cũng đừng bỏ qua một điều vì nó nhỏ. Mỗi phát hiện phải có tệp, dòng, điều bị vi phạm và bằng chứng. Nếu một phát hiện cần đổi hợp đồng thì ghi "cần quyết định ở hợp đồng"; đừng đề xuất trả một nhãn mà hợp đồng không khai.
