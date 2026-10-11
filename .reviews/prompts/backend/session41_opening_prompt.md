Bạn là coding agent của dự án Commission Tracker, phiên theo layer `backend`, phiên số 41 của dự án. Định danh phiên là `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác. Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/backend_plan.md`. Đây là phiên ngắn của chặng G, không thêm tính năng, gồm ba mã:
  - **BE-11:** kiểm thử chứng minh cơ chế nâng cấp cấu trúc lưu trữ chạy đúng khi có một bước nâng cấp áp lên dữ liệu đã có, ở cả sáu workflow có bảng;
  - **BE-9:** `wire_workflows` bắt buộc nhận `app_version`;
  - **BE-10:** bỏ mọi `# noqa`, `# type: ignore`, `# pragma` trong `Backend/`.
- Mọi tệp bạn tạo hoặc sửa nằm trong `Backend/`. Được **chạy**, nhưng không sửa, `Desktop/` và `UI/`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`10.0.1`** và API Contract **`5.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

2. Làm việc 1 của plan:
   - môi trường;
   - hỏi tôi hôm nay đã có phiên coding agent nào chạy chưa;
   - mốc `pytest` (564);
   - mốc `%APPDATA%`;
   - `git status --short`.

   Trước dòng code đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - các mốc;
   - sáu workflow có bảng, và bước 2 giả bạn định dùng cho từng workflow;
   - cách bạn định khởi động lại trong kiểm thử;
   - số chỗ gọi `wire_workflows` bạn đếm được;
   - điểm nào trong plan hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan.

4. **Những điều không làm:**
   - Không thêm bước nâng cấp nào vào `_STORAGE_UPGRADES` của mã sản phẩm. Bước 2 chỉ tồn tại trong kiểm thử.
   - Không sửa `scaffold_backend`, không đổi cách `ensure_storage()` chạy. Nếu khẳng định (e) của BE-11 (bước hỏng thì hoàn tác cả) không đạt thì **dừng lại và báo tôi**, không tự sửa.
   - Không đổi cấu trúc bảng, điểm giao tiếp, nhãn hay mã lỗi. Không thêm phụ thuộc, linter hay công cụ kiểm kiểu.
   - Không tắt, không đổi cấu hình antivirus. Không sửa registry, không cài bộ cài.
   - Không đụng `%APPDATA%\CommissionTracker` thật.
   - Không thêm `noqa`, `type: ignore`, `pragma` hay chú thích tắt kiểm tra nào khác.
   - Không dùng sub-agent.
   - Phép cắn nào bị bộ phân loại quyền chặn thì ghi lại rồi đi tiếp, không tìm đường vòng.

   **Quy ước:** giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn. Nếu sửa checkpoint sau khi đã chạy toàn bộ, chạy lại `pytest` một lượt và nói rõ trong báo cáo.

5. Phiên này không cần tôi chạy tay. Tôi dùng máy bình thường trong lúc kiểm thử chạy.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên máy này, với antivirus đang bật.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md` mục 5, kèm đủ các mục ở tiêu chí 9 của plan:
   - từng workflow: bước 2 giả và kết quả năm khẳng định, nói riêng khẳng định (e);
   - các phép cắn;
   - số chỗ gọi `wire_workflows` đã sửa;
   - bảng BE-10;
   - số đạt của ba lượt `pytest`, Desktop `npm test`, UI e2e;
   - các lệnh để chạy lại;
   - danh sách tệp trong `git status --short`, kèm `git check-ignore -v` cho từng tệp mới.
