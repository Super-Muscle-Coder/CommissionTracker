Bạn là coding agent của dự án Commission Tracker, phiên theo layer `backend`, phiên số 42 của dự án. Định danh phiên là `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác. Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phiên này là một phiên kiểm độc lập** của chặng H (rà soát lại toàn bộ V1). Plan nằm ở `.plan/backend_plan.md`. Bạn kiểm xem `Backend/` có theo đúng skill `wca-implementation` v2.3 và đúng hợp đồng không. Phiên có hai pha; **plan hiện tại chỉ là pha 1: chỉ đọc.**

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. **Ở pha 1, không đọc `.plan/open_issues.md` và `.plan/v1_roadmap.md`**, để cái nhìn của bạn không bị dẫn dắt bởi phát hiện cũ. Xác nhận Data Schema **`10.0.1`** và API Contract **`6.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

2. Làm việc 1 của plan:
   - môi trường;
   - `git status --short`;
   - hỏi tôi hôm nay đã có phiên coding agent nào chạy chưa;
   - một lượt `pytest` (mốc 573).

   Báo lại cho tôi trong tối đa 8 dòng: các mốc, và cách bạn định chia việc đọc qua K1–K7. Rồi làm tiếp luôn, không cần chờ.

3. Trả lời K1 → K7, rồi làm ít nhất năm phép cắn, **chỉ trên bản sao nằm ngoài kho** (ví dụ `$env:TEMP\ct_review_backend\`). Xóa bản sao khi xong.

4. **Những điều không làm ở pha 1:**
   - Không sửa, không tạo, không xóa tệp nào trong kho, kể cả checkpoint, kể cả lỗi chính tả.
   - Không đọc, không ghi `.reviews/`. Không sửa `.contracts/`, `CLAUDE.md`, `.plan/`, `.design/`.
   - Không chạy lệnh git nào đổi trạng thái kho.
   - Không đụng `%APPDATA%\CommissionTracker` thật.
   - Không tắt, không đổi cấu hình antivirus. Không cài thêm gói hay công cụ nào.
   - Không dùng sub-agent.
   - Phép cắn nào bị bộ phân loại quyền chặn thì ghi lại rồi đi tiếp, không tìm đường vòng.

5. Cuối pha 1, `git status --short` phải giống hệt đầu phiên. Gửi báo cáo bằng tiếng Việt theo mục "BÁO CÁO PHA 1" của plan, đủ sáu phần, rồi **dừng và chờ**. Không tự sửa gì, kể cả việc nhỏ. Pha 2 sẽ đến qua tôi, kèm plan mới.

6. Đừng tạo phát hiện cho đủ số, cũng đừng bỏ qua một điều vì nó nhỏ. Mỗi phát hiện phải có tệp, dòng, điều bị vi phạm và bằng chứng.
