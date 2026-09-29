Bạn là coding agent của dự án Commission Tracker, phiên theo layer `ui`, phiên số 21 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/ui_plan.md`. Đây là **phiên vá ngắn, chỉ làm UI-10** (`.plan/open_issues.md`): spec e2e khẳng định chữ trên `getByRole('status')` mà không lọc, cùng một phép kiểm tĩnh chặn lỗi này tái phát.
- **Không sửa `UI/src/`**, trừ khối chú thích checkpoint ở `src/screens/navigation.ts` và `src/main.tsx`. Chỉ sửa trong `UI/tests/`, `UI/scripts/`, và script `check` của `UI/package.json`. Được **chạy**, nhưng không sửa, `Desktop/` và `Backend/`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới. Mọi lệnh npm chạy từ `UI`.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`8.0.1`** và API Contract **`4.0.0`**, cả hai `approved`; sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường; mốc `check` và `e2e` (có `CT_WALKTHROUGH_RUNNER`); 30 lần spec `commission_form`; mốc `%APPDATA%`; `git status --short`. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - mốc kiểm thử, gồm số lần hỏng của spec `commission_form` và câu lỗi;
   - danh sách mọi chỗ `getByRole('status')` trong `tests/e2e/`, và bạn định giữ hay sửa từng nhóm;
   - phép kiểm tĩnh sẽ nhận ra mẫu sai thế nào, và vì sao nó không báo nhầm các chỗ đã lọc;
   - điểm nào trong plan bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan. Thấy lỗi của sản phẩm thì ghi lại và báo, không sửa `src/`.

4. Không nới thời gian chờ, không thêm `retries`, không đánh dấu `skip`, `fixme` hay `flaky`. Không tắt luật, không thêm `eslint-disable`.

5. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên Windows, gồm:
   - spec `commission_form` đạt **30 lần liên tiếp**;
   - `npm run e2e` đạt **5 lần liên tiếp**, có đặt `CT_WALKTHROUGH_RUNNER` đúng định danh phiên của bạn;
   - một lần không đặt biến để lại `UI/evidence` nguyên vẹn.

6. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - các lệnh để tôi tự chạy;
   - danh sách các chỗ `getByRole('status')` đã rà và quyết định từng chỗ;
   - kết quả theo dõi `main_layout.spec.ts`;
   - đề xuất trạng thái năm trang D2 và D3;
   - danh sách tệp trong `git status --short`.
