# LỘ TRÌNH PHIÊN BẢN — COMMISSION TRACKER

*Quyết định của Project Owner, 2026-09-28, ghi lại bởi Orchestrator. Tài liệu bền: không ghi đè mỗi phiên. Phạm vi chi tiết của V1 nằm ở `.design/v1_scope.md`; lộ trình từng chặng của V1 ở `.plan/v1_roadmap.md`.*

## Nguyên tắc

Các phiên bản đầu làm cho mọi thứ **bình thường và ổn định** nhất có thể. Tính năng cao cấp, độc lạ để các phiên bản sau, khi nền đã chịu được. **Làm ra cái gì thì phải chắc cái đó.**

## Các phiên bản

| Phiên bản | Trọng tâm | Không làm |
|---|---|---|
| **V1** | Nền tảng. Các tính năng cốt lõi, phổ thông nhất (khách hàng, đơn hàng, tiến độ, thanh toán, thu nhập, nhắc việc, sao lưu). Chạy ổn định ở dạng đơn giản nhất. Đóng gói, cài được, chạy trên máy sạch | Gọt giao diện, hiệu ứng, tính năng phụ |
| **V2** | **Củng cố:** làm chắc thêm nền tảng và các tính năng của V1; kiểm thử nhiều hơn; lường trước nhiều ca sử dụng thật hơn. **Trải nghiệm dùng** (cognitive ease): tổ chức tính năng, bố cục, vị trí nút và component, thao tác tay và việc chạy nền, thông báo. Mục tiêu là cảm giác "dùng sướng", không phải "nhìn đẹp" | Tính năng mới, thay đổi diện mạo thị giác |
| **V3** | **Thay áo:** diện mạo thị giác (màu sắc, typography, animation, transition, component nịnh mắt). Được tham khảo nguồn ngoài như React Bits | Tính năng mới |
| **V4 trở đi** | Tính năng độc lạ, cao cấp: **watermark ẩn** (`apply_watermark`, `verify_watermark`, `clause_c_ai_service`), và các tính năng khác | — |

## Hai kiểu "đẹp", đừng nhầm

- **Dễ chịu khi dùng** (cognitive ease). Người dùng không phải nghĩ nhiều, không bị quá tải thông tin, biết ngay phải làm gì tiếp, mọi thứ nằm đúng chỗ họ mong đợi, tương tác diễn ra tự nhiên. Phản ứng của họ: "dùng sướng ghê", "không biết tại sao nhưng thấy rất dễ chịu". Đây là trọng tâm của **V2**.
- **Đẹp mắt** (thị giác). Màu hài hòa, chữ đẹp, animation mượt, bố cục cân đối. Phản ứng của họ: "wow, đẹp quá". Đây là trọng tâm của **V3**.

Người dùng mục tiêu là họa sĩ, và Project Owner cũng là họa sĩ. Họ sẽ để tâm tới trải nghiệm dùng.

## Hệ quả cho V1 (Orchestrator ghi, Project Owner đã đồng ý hướng)

- **Giao diện tối là chủ đạo.** Giao diện sáng để sau; thêm được rẻ, vì mọi giá trị trình bày đều đi qua token (luật R7 của iWCA).
- **Cảm giác tổng thể:** gọn gàng, chuyên nghiệp, tinh tế, thoải mái, không dày thông tin.
- V1 vẫn theo một mức "dễ chịu" tối thiểu, gần như không tốn thêm công: `.design/ui_decomposition.md`, mục 7. Lý do: để V2 không phải bố trí lại mọi màn hình từ đầu. Việc bố trí lại màn hình ở V2 không đụng tới logic, vì iWCA tách `screens/` và `kit/` khỏi `logic/`.
- **Đầu vào cho V2** (đề xuất của Orchestrator): khi V1 xong, Project Owner dùng ứng dụng cho công việc thật vài tuần, và nhờ vài họa sĩ khác dùng thử. Mỗi chỗ vướng, khó chịu hay phải nghĩ lâu thì ghi một dòng. V2 sửa theo nhật ký đó, không đoán.

## Ghi chú cho các phiên bản sau

- **V3 và Tailwind:** đổi từ CSS Modules cộng token sang Tailwind là đổi luật của layer giao diện (R7, `kit`). Đó là một quyết định **kiến trúc**, không chỉ là chuyện thẩm mỹ; bàn riêng khi tới V3. React Bits có bản dùng CSS thường, hợp với cách làm hiện tại. Trước khi chép mã từ React Bits, kiểm giấy phép ở repo gốc.
- **Watermark (V4 trở đi):** mọi kết luận đã bàn vẫn giữ ở `.design/v1_scope.md` mục 3.1–3.2. Ở đó, chữ "V2" nay đọc là "phiên bản làm watermark". Hợp đồng không đổi: ba workflow vẫn ở `đang_chờ_triển_khai`.
