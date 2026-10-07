Bạn là coding agent của dự án Commission Tracker, phiên theo layer `desktop`, phiên số 33 của dự án (định danh phiên: `coding-agent@<YYYY-MM-DD>#<số thứ tự phiên trong ngày>`; đếm mọi phiên đã chạy trong ngày, kể cả phiên của layer khác). Bạn chưa làm việc trên dự án này trước đây. Mọi điều bạn cần biết nằm trong tài liệu, hợp đồng, checkpoint và plan.

**Phạm vi:**
- Plan của phiên này nằm ở `.plan/desktop_plan.md`. Hai việc gắn liền nhau, kèm một việc dọn dẹp:
  - **lối vào `ipc` đầu tiên:** thêm hàm `invoke` vào bridge `window.commissionTracker` mà preload phơi cho renderer;
  - **thành phần cắt ngang `native_dialogs`, chỉ lối vào `pick_folder`** (`dialog:pick-folder`): hộp thoại chọn thư mục của Windows;
  - **DSK-19:** dọn checkpoint của phiên 30.

  Đặc tả đã chốt nằm trong plan, mục "ĐẶC TẢ ĐÃ CHỐT".
- Mọi tệp bạn tạo hoặc sửa nằm trong `Desktop/`. Được **chạy**, nhưng không sửa, `Backend/` và `UI/`. Không chạy UI e2e với `CT_WALKTHROUGH_RUNNER`.
- Các thư mục bắt đầu bằng dấu chấm chỉ để đọc. Riêng `.reviews/` thì không đụng tới.
- Không chạy lệnh git nào đổi trạng thái kho (`CLAUDE.md` mục 2).

1. Đọc tài liệu theo `08-operating-protocol.md`, Phần 1, với danh sách ở việc 0 của plan. Xác nhận Data Schema **`9.0.3`** và API Contract **`4.0.0`**, cả hai `approved`. Sai thì dừng lại và báo.

2. Làm việc 1 của plan: môi trường; trạng thái antivirus (hỏi tôi nếu cần); mốc `lint` và `npm test` (31); mốc `%APPDATA%`; `git status --short`. Rồi làm **việc 2**: đo xem kiểm thử có thay được hộp thoại thật mà không cần cờ mới không. Sau đó, trước dòng code đầu tiên, báo lại cho tôi trong tối đa 8 dòng:
   - mục tiêu của phiên;
   - các mốc;
   - kết quả đo ở việc 2, và cách thay hộp thoại bạn sẽ dùng;
   - cách preload biết danh sách địa chỉ được phép, và cách Main kiểm khung gửi;
   - điểm nào trong plan hay hợp đồng bạn thấy mâu thuẫn hoặc thiếu.

   Nếu không có gì chặn đường, tiếp tục làm luôn.

3. Làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ". Không bỏ việc, không thêm việc ngoài plan. Chỉ làm `pick_folder`, không làm `open_file` hay `save_file`.

4. **Không bật `nodeIntegration`, không tắt `contextIsolation` hay `sandbox`, không đưa `ipcRenderer` cho renderer.** Không tắt, không đổi cấu hình antivirus. Không sửa registry, không cài bộ cài. Không đụng `%APPDATA%\CommissionTracker` thật: mọi lần chạy ứng dụng đều kèm `--ct-test-data-dir`. Không tắt luật, không thêm `eslint-disable`. Giờ ghi trong checkpoint chép nguyên giá trị `Get-Date -Format o`, không làm tròn.

5. **Cần tôi ở một chỗ:** xác nhận hộp thoại thật bằng mắt (việc 5): `npm run probe`, bấm "Chọn thư mục", chọn rồi hủy.

6. Chỉ coi phiên là xong khi đạt đủ "TIÊU CHÍ HOÀN TẤT PHIÊN" trên máy này, với antivirus đang bật.

7. Cuối phiên, gửi báo cáo **ngắn gọn** bằng tiếng Việt theo `CLAUDE.md`, mục 5. Kèm:
   - kết quả đo ở việc 2;
   - bảng ca kiểm thử;
   - hai phép cắn;
   - câu trả lời của tôi về hộp thoại thật;
   - các lệnh để chạy lại;
   - danh sách tệp trong `git status --short`;
   - danh sách ngoại lệ lint mới, nếu có.
