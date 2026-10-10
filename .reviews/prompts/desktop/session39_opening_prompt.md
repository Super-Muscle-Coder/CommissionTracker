Bạn là coding agent của dự án Commission Tracker, phiên theo layer `desktop`, phiên số 39 của dự án. Định danh phiên là `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác. Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/desktop_plan.md`. Đây là phiên vá ngắn, mở đầu chặng G, gồm hai mã:
  - **DSK-28:** backend chết ngay sau READY thì hiện hai hộp thoại lỗi; sửa để chỉ còn một;
  - **DSK-29:** dọn thư mục tạm của kiểm thử, sửa một chú thích, sửa một `last_updated_by`, bỏ chú thích `eslint-disable` duy nhất trong `Desktop/`.
- Mọi tệp bạn tạo hoặc sửa nằm trong `Desktop/`. Được **chạy**, nhưng không sửa, `Backend/` và `UI/`. Script làm máy tải nằm ngoài dự án.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`10.0.1`** và API Contract **`5.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

2. Làm việc 1 của plan:
   - môi trường;
   - trạng thái antivirus, và hôm nay đã có phiên coding agent nào chạy chưa (hỏi tôi);
   - mốc `lint` và `npm test` (76);
   - số thư mục `ct-desktop-*` trong `%TEMP%`;
   - mốc `%APPDATA%`;
   - `git status --short`.

   Rồi làm **việc 2**, tức đo xem có tái hiện được lỗi hai hộp thoại mà không cần máy tải không. Sau đó, trước dòng code sửa đầu tiên, báo lại cho tôi trong tối đa 10 dòng:
   - mục tiêu của phiên;
   - các mốc;
   - kết quả đo ở việc 2;
   - danh sách mọi chỗ gọi `fatal()`, và với mỗi chỗ, nó có thể chạy khi `shutdown()` đã bắt đầu không;
   - cờ chặn bạn định dùng, và cách bạn định bỏ `eslint-disable`;
   - điểm nào trong plan hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan.

4. **Những điều không làm:**
   - Không đổi nhãn hay mã lỗi của hợp đồng. Không thêm lối vào `ipc` hay cờ `--ct-test-*`. Không thêm mã vào sản phẩm chỉ để kiểm thử.
   - Không đổi chữ của dòng `FATAL:` đầu tiên, của các câu hộp thoại, hay của `failure_exit_code`.
   - Không thay `_electron.launch`. Không nới thời gian chờ, không `retries`, không `skip`.
   - Không tắt, không đổi cấu hình antivirus. Không sửa registry, không cài bộ cài.
   - Không đụng `%APPDATA%\CommissionTracker` thật: mọi lần chạy ứng dụng đều kèm `--ct-test-data-dir`.
   - Không tắt luật lint. Không thêm `eslint-disable`, `@ts-ignore`, `@ts-expect-error` hay `@ts-nocheck`.
   - Khi dọn thư mục tạm, chỉ xóa thư mục do chính lượt chạy đó tạo ra.
   - Không dùng sub-agent.
   - Phép cắn nào bị bộ phân loại quyền chặn thì ghi lại rồi đi tiếp, không tìm đường vòng.

   **Quy ước:** giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn. Nếu sửa checkpoint sau khi đã chạy toàn bộ, chạy lại `npm test` một lượt và nói rõ trong báo cáo.

5. Phiên này không cần tôi chạy tay, trừ khi bạn thấy cần. Tôi dùng máy bình thường trong lúc kiểm thử chạy.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên máy này, với antivirus đang bật.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md` mục 5, kèm đủ các mục ở tiêu chí 10 của plan:
   - kết quả đo;
   - các chỗ gọi `fatal()` và cờ đã chọn;
   - chữ nguyên văn của dòng log cho lần gọi bị bỏ qua;
   - các phép cắn;
   - số đạt của bốn lượt `npm test` (ba có tải, một không tải);
   - số thư mục tạm trước và sau;
   - cách đã bỏ `eslint-disable`;
   - kết quả `dist`, `test:packaged` và UI e2e;
   - các lệnh để chạy lại;
   - danh sách tệp trong `git status --short`, kèm `git check-ignore -v` cho từng tệp mới;
   - danh sách ngoại lệ lint mới (phải rỗng).
