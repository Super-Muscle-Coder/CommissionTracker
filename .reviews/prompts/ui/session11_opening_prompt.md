Bạn là coding agent của dự án Commission Tracker, phiên theo layer `ui`, phiên số 11 của dự án và là phiên giao diện đầu tiên (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng và checkpoint.

Plan của phiên này nằm ở `.plan/ui_plan.md`. Mọi tệp bạn tạo hoặc sửa đều nằm trong `UI/`. Được **chạy**, nhưng không sửa, `Desktop/` và `Backend/`. Không đụng tới `CommissionTracker.slnx`. Các thư mục bắt đầu bằng dấu chấm chỉ để đọc; `.reviews/` thì không đụng tới. Mọi lệnh npm chạy từ thư mục `UI`, trừ khi plan nói khác.

Phiên này làm Giai đoạn I2 của iWCA (dựng khung layer), **không** làm trang nào.

1. Đọc tài liệu theo đúng thứ tự ở `08-operating-protocol.md`, Phần 1, với danh sách cụ thể ở việc 0 của plan:
   - `CLAUDE.md`, đặc biệt mục 5, đoạn "Vận hành layer giao diện";
   - skill `wca-implementation` v2.3;
   - skill **`iwca-implementation` v1.0**, đọc toàn bộ, đặc biệt `iwca_theory.md` §6, §7 và `i2-scaffold.md`;
   - hợp đồng;
   - `.design/ui_decomposition.md`;
   - NOTE "Cho phiên B2 (UI)" trong checkpoint của `Desktop/src/main.ts`;
   - cuối cùng là plan.

   Trước khi làm gì khác, xác nhận Data Schema ở `6.1.0`, API Contract ở `4.0.0`, và cả hai đều `contract_state: approved`. Nếu thấy phiên bản khác, dừng lại và báo.

2. Trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - phiên bản Node, npm;
   - bộ gói bạn định khóa, và các ràng buộc peer dependency bạn đã kiểm;
   - với từng luật R1–R14: cơ chế kiểm bạn định dùng (luật lõi ESLint, `typescript-eslint`, `stylelint`, hay script riêng). Tóm gọn, một dòng cho cả nhóm luật cùng cơ chế;
   - có điểm nào trong plan, iWCA hay hợp đồng mà bạn thấy mâu thuẫn hoặc thiếu không.

   Nếu không có vấn đề chặn đường, tiếp tục làm luôn.

3. Làm theo mục "VIỆC CẦN LÀM, THEO THỨ TỰ" của plan. Được đảo thứ tự nếu có lý do chính đáng, nhưng phải ghi lại. Không bỏ việc, không thêm việc ngoài plan. Nếu thấy plan sai ở chỗ nào, làm theo hợp đồng và iWCA, rồi nêu rõ trong báo cáo.

4. Bằng chứng "luật cắn" (việc 9) là phần quan trọng nhất của phiên. Một luật mà chưa có vi phạm cố ý nào bị bắt thì coi như chưa có. Không tắt luật, không thêm `eslint-disable` để lọt vi phạm.

5. Nếu nghi hợp đồng hay `ui_decomposition.md` sai hoặc thiếu, xử lý theo `08-operating-protocol.md`, Phần 4: không tự sửa, không đoán.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" của plan, chạy trên Windows.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm hai lệnh `npm run check` và `npm run e2e` để tôi tự chạy thử, và danh sách mọi ngoại lệ lint đã thêm, kèm lý do.
