Bạn là coding agent của dự án Commission Tracker, phiên theo layer `ui`, phiên số 20 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/ui_plan.md`. Có hai phần:
  - trước tiên vá **UI-9** (e2e `commission_form` S2 không tất định) và **Q19-3**;
  - sau đó làm **chặng D3, tiến độ**: workflow giao diện `update_progress`, trang `progress_board`, trang `stage_change`, và phần "Tiến độ" trong `commission_detail`.
- Đặc tả nằm ở `.design/ui_decomposition.md`, mục "Chặng D3 — Tiến độ", cùng §5 và §7.
- Mọi tệp bạn tạo hoặc sửa đều nằm trong `UI/`. Được **chạy**, nhưng không sửa, `Desktop/` và `Backend/`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới. Mọi lệnh npm chạy từ `UI`.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`8.0.1`** và API Contract **`4.0.0`**, cả hai `approved`, và `update_progress` ở `đã_hoàn_thiện`; sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường; mốc `check` và `e2e` (có `CT_WALKTHROUGH_RUNNER`); 10 lần spec `commission_form`; mốc `%APPDATA%`; `git status --short`. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - mốc kiểm thử, gồm số lần hỏng của spec `commission_form`;
   - bạn sửa UI-9 ở đâu, và những khẳng định vị trí nào bạn đã tìm thấy trong các spec;
   - danh sách lối vào Routers của `update_progress`, và thao tác nào gồm nhiều lời gọi;
   - bạn làm khung xác nhận trong trang bằng component nào;
   - điểm nào trong plan, `ui_decomposition.md` hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Được đảo thứ tự nếu có lý do; phải ghi lại. Không bỏ việc, không thêm việc ngoài plan.

4. Không có màn hình hồ sơ quyền sở hữu. Không làm D4 trở đi, không làm việc V2, không sửa Desktop. Không dùng `window.confirm` hay hộp thoại gốc. Không gọt giao diện, không thư viện ngoài. Không tắt luật, không thêm `eslint-disable`. Nếu cần một điều chưa có trong `ui_decomposition.md`, dừng lại và báo. Nghi hợp đồng sai hoặc thiếu thì xử lý theo `08-operating-protocol.md`, Phần 4.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên Windows, gồm:
   - `npm run e2e` đạt **5 lần liên tiếp**, có đặt `CT_WALKTHROUGH_RUNNER` đúng định danh phiên của bạn;
   - spec `commission_form` đạt **10 lần liên tiếp**;
   - một lần chạy không đặt biến để lại `UI/evidence` nguyên vẹn.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - các lệnh, và **các bước bấm tay** cho hai kịch bản mới và các bước mới của `commission_detail`, để tôi tự chạy;
   - đề xuất trạng thái của năm trang D2 và D3;
   - danh sách tệp trong `git status --short`;
   - danh sách ngoại lệ lint mới, nếu có.
