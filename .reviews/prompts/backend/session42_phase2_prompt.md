Cảm ơn báo cáo pha 1. Orchestrator đã kiểm lại và tái lập được R42-1, R42-2, R42-3, R42-10; báo cáo pha 1 đạt.

Trả lời câu hỏi còn treo: hôm nay chưa có phiên coding agent nào chạy trước phiên này, nên định danh phiên là `coding-agent@2026-10-12#1`.

**Bắt đầu pha 2.** Plan pha 2 đã ghi đè `.plan/backend_plan.md`. Đọc lại plan đó từ đầu, rồi làm theo "VIỆC CẦN LÀM, THEO THỨ TỰ (PHA 2)". Từ pha 2 bạn được sửa tệp trong `Backend/`, và được đọc `.plan/open_issues.md` ở các mục plan nêu.

Ba điểm cần chú ý:

1. **Hợp đồng vừa đổi:** API Contract **6.1.0** (CT-10). Đọc mục changelog v6.1.0 và câu mới cuối `endpoint_forms.http`: tham số truy vấn không khai báo thì bị bỏ qua. Vì vậy R42-9 **không đổi hành vi**: chỉ gỡ mã chết và thêm ca khóa luật.

2. **Nhãn:** mọi lỗi mới trả đúng nhãn mà lối vào đó đã khai. 16 trong 17 lối vào `GET` không khai 400. Với R42-1, tham số đường dẫn mang mã định danh giữ cách xử lý mã định danh sai dạng hiện có. Gặp chỗ nào dường như phải trả một nhãn không khai báo thì dừng lại và báo.

3. **BE-12 làm trước:** nâng `starlette` lên `1.3.1`, cài vào `Backend\env`. Đây là ngoại lệ duy nhất cho luật "không cài gói".

Những ràng buộc cũ vẫn giữ:
- không sửa ngoài `Backend/`;
- không lệnh git đổi trạng thái kho;
- không đụng `%APPDATA%\CommissionTracker` thật;
- không đổi antivirus;
- không sub-agent;
- giờ checkpoint chép nguyên `Get-Date -Format o`.

Khi xóa bản sao tạm, chỉ xóa đúng thư mục bạn tạo, gọi đích danh. Không xóa theo mẫu tên như lần trước.

Cuối pha 2, gửi báo cáo ngắn gọn bằng tiếng Việt theo tiêu chí 8 của plan.
