Cảm ơn báo cáo pha 1. Orchestrator đã kiểm lại trên Linux và đánh giá báo cáo pha 1 đạt:
- `npm run check` cho 1936/1936, khớp lượt chạy của bạn;
- năm phép cắn không bị bắt (R44-1, R44-2, R44-4, R44-5, R44-6) đều tái lập được;
- các trích dẫn mã đã đối chiếu đều đúng.

Project Owner đã duyệt cả bảng R44-1 → R44-17. R44-2 nâng lên mức **cao**, cho khớp mục UI-23 đã có. Ba mục R44-8, R44-13, R44-15 được ghi thành ngoại lệ có chủ đích ở `.design/ui_decomposition.md` §8: mã của ba chỗ đó không đổi.

**Bắt đầu pha 2, cùng phiên 44.** Plan pha 2 đã ghi đè `.plan/ui_plan.md`. Đọc lại plan đó từ đầu, rồi làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ (PHA 2)". Từ pha 2, bạn được sửa tệp trong `UI/`, và được đọc `.plan/open_issues.md` ở các mục plan nêu.

**Trước khi ghi checkpoint đầu tiên, hỏi tôi hai điều còn bỏ ngỏ từ pha 1:**
1. số thứ tự phiên trong ngày, để thay `#?` trong định danh `coding-agent@2026-10-16#?`;
2. trạng thái antivirus.

Bốn điểm cần chú ý:

1. **Hai việc mức cao làm trước:** R44-1 (luật R7 cho `.ts`/`.tsx` của kit) và R44-2 (bước kiểm bốn đường dẫn watermark trong `npm run check`). Bước kiểm của R44-2 không có danh sách miễn trừ, nên các comment và EVIDENCE trong `src/screens/navigation.ts` đang ghi nguyên văn bốn đường dẫn đó phải được viết lại.

2. **Đặc tả đã đổi ở hai chỗ** (Orchestrator ghi, Project Owner duyệt): `.design/ui_decomposition.md` §8 (ba ngoại lệ), và mục `commission_form` của D2 (tải lại danh sách khách sau mọi lần phía sau từ chối việc lưu, khớp mã hiện tại). Pha 2 không đổi điều người dùng thấy. Nếu một việc buộc phải đổi, dừng lại và báo.

3. **R44-17:** plan có đính chính. Ca `main_layout` đợi để chứng minh *không có* thông báo lỗi, nên có thể không có điều kiện dương để chờ. Không có thì giữ lệnh ngủ và ghi lý do. Không nới hay rút thời gian.

4. **Chạy:** `npm run check` ba lượt và `npm run e2e` ba lượt liên tiếp, không đặt `CT_WALKTHROUGH_RUNNER`, trên máy tôi trong lúc tôi dùng máy bình thường. Mọi lượt hỏng đều tính và phải báo. `UI/evidence/` không đổi.

Những ràng buộc cũ vẫn giữ:
- chỉ sửa trong `UI/`; ở `Desktop/` chỉ chạy `npm run build`;
- ⚠ không thêm màn hình hồ sơ quyền sở hữu;
- không lệnh git đổi trạng thái kho;
- không đụng `%APPDATA%\CommissionTracker` thật;
- không đổi antivirus;
- không sub-agent;
- không `eslint-disable`, `@ts-*`, `stylelint-disable`;
- không nới thời gian chờ, không `retries`, `skip`;
- không `npm ci`, `npm install`, `npm version`;
- phép cắn chỉ làm trên bản sao `%TEMP%\ct_review_ui\`, `/XD` ghi đường dẫn đầy đủ, xóa đúng thư mục đó khi xong;
- giờ checkpoint: mỗi khối lấy `Get-Date -Format o` riêng, ngay trước khi ghi khối đó;
- nếu sửa checkpoint sau ba lượt chạy, chạy lại `npm run check` một lượt.

Cuối pha 2, gửi báo cáo ngắn gọn bằng tiếng Việt theo mục "BÁO CÁO PHA 2" của plan.
