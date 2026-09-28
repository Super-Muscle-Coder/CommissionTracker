Tôi đã đọc báo cáo của bạn và đã tự đối chiếu lại: 354/354 đạt, mọi mục của plan đều khớp hợp đồng. Hai điểm bạn nêu trong NOTES đều có thật, tôi đã tái hiện được cả hai. Cảm ơn.

Phiên này chưa đóng. Còn một đợt việc nhỏ nữa, tôi mô tả đủ ở đây, bạn không cần mở phiên mới.

**Ba tệp context đã đổi kể từ lúc bạn đọc chúng. Đọc lại cả ba trước khi làm:**

1. `CLAUDE.md`, mục 5 — có hai quy ước mới, áp dụng ngay từ bước tiếp theo của bạn:
   - **Tường thuật ba phần trong lúc làm việc.** Mỗi bước thật sự làm việc kể đủ: việc đang làm, căn cứ của quyết định (điều khoản hợp đồng, mục của plan hay checkpoint dẫn tới cách làm đó), rồi kết quả. Từ trước tới giờ bạn mới kể việc làm và kết quả; phần giữa là phần tôi cần, viết như một câu `content` của EXPERIENCES. Viết gọn, một tới ba câu, không thành đoạn văn.
   - **Cách sửa `Backend.pyproj`.** Đường dẫn trong đó dùng dấu chéo ngược của Windows. Sửa thẳng bằng công cụ soạn thảo tệp, đừng viết script rồi chạy qua shell, cũng đừng dùng heredoc: bạn đã vướng đúng lỗi escape này ở phiên 4, 5, 6 và 7.

2. `.contracts/data_schema.yaml` — nay ở `5.1.0`, vẫn `approved`. Đọc hai mục changelog `5.1.0` ở đầu tệp. Cả hai đều đến từ NOTES của bạn:
   - `reminder_settings_record`: mỗi mốc báo trước **tối đa 365 ngày (8760 giờ)**.
   - `send_reminder.description`: câu về việc đổi hạn chót được viết lại cho rõ. Cách làm hiện tại của bạn là đúng; hợp đồng mới là cái phải sửa.

3. `.plan/backend_plan.md` — **không** đổi. Plan phiên 7 đã hoàn tất; đợt việc dưới đây thay cho mục "VIỆC CẦN LÀM" cũ.

**Việc cần làm, theo thứ tự:**

1. **Áp cận trên của mốc báo trước** (Data Schema 5.1.0). Mỗi mốc tối đa 365 ngày hoặc 8760 giờ; vượt thì `400 ERR_VALIDATION`, như các ràng buộc khác của `lead_times`. Kiểm tra ở Routers, cùng chỗ với các luật định dạng khác của `reminder_settings_input`. Bổ sung kiểm thử: `{365, days}` và `{8760, hours}` được nhận; `{366, days}` và `{8761, hours}` bị từ chối.

   Sau việc này, cái bẫy bạn ghi trong NOTES (mốc lớn tới mức `due_at` rơi ra ngoài lịch, bị bỏ qua lặng lẽ) không còn xảy ra được nữa. Phần code phòng thủ cho trường hợp đó bạn cứ giữ, không cần gỡ.

2. **Dọn NOTES của `send_reminder`:**
   - NOTE đề xuất `status`: xóa sau khi tôi duyệt ở việc 5.
   - NOTE gồm hai ý (a) và (b): cả hai đã được xử lý. Ý (a) nay là luật chính thức trong hợp đồng, ý (b) được cận trên ở việc 1 chặn đứng. Xóa NOTE đó, và chuyển phần còn giá trị lâu dài thành một mục EXPERIENCES mới: cách nhớ "đã nhắc" theo (đơn, hạn chót, độ dài mốc) có nghĩa gì khi hạn chót bị đổi đi rồi đổi về, và vì sao có cận trên 365 ngày. Đặt `derived_from` trỏ tới mục kinh nghiệm hiện có về nhắc hạn chót.

3. **Sửa EVIDENCE đầu tiên trong checkpoint của Main** (từ phiên 1). Nó ghi lệnh `-k "not commissions"` kèm kết quả "10 passed". Lệnh đó giờ chọn nhiều kiểm thử hơn nên chạy lại sẽ ra số khác, tức là một mục EVIDENCE không còn tái lập được. Sửa cho lệnh chỉ chọn đúng các kiểm thử về vòng đời tiến trình mà nó vốn nói tới, giữ nguyên `claim` và `result`. Nếu phải đổi cách chọn (ví dụ thêm marker pytest hay đổi tên hàm kiểm thử), chạy lại đúng lệnh mới rồi ghi lại kết quả thật.

4. **Chạy lại toàn bộ kiểm thử**, rồi cập nhật EVIDENCE toàn layer của Main theo lần chạy đó — như bạn đã làm ở cuối phiên 7.

5. **Trạng thái:** tôi duyệt `send_reminder` → `đã_hoàn_thiện` sau khi việc 1 xong. Tôi sẽ tự sửa `.contracts/`; bạn không đụng vào.

**Không được làm:** sửa code của workflow nào khác; sửa `.contracts/`; bắt đầu `backup_data` hay bất cứ workflow nào mới.

**Xong thì báo cáo ngắn gọn** theo `CLAUDE.md`, mục 5, như mọi khi.
