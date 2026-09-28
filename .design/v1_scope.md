# PHẠM VI V1 — COMMISSION TRACKER

*Quyết định của Project Owner, 2026-09-26. Tài liệu bền: không ghi đè mỗi phiên. Mọi plan của phiên phải nằm trong ranh giới tệp này.*

## 1. Ba ưu tiên của V1

Khi phải đánh đổi, xét theo đúng thứ tự này.

**1. Nền tảng vững và linh hoạt.** Xây đến đâu chắc đến đó. Mỗi phần phải đủ chỗ để mở rộng, tối ưu và phát triển thêm ở các phiên bản sau, không phải đập đi làm lại.

**2. Dạng đơn giản nhất mà chạy đúng.** Một tính năng của V1 phải chạy được, dùng được, hoạt động đúng như đã cam kết trong hợp đồng, và thật sự vững. Những thứ sau **không** phải việc của V1: tiện ích phụ làm mượt trải nghiệm, tối ưu hiệu năng, gọt giao diện cho đẹp, thuật toán tối ưu hơn, và việc thâu tóm mọi ca hiếm mà hợp đồng không đòi.

**3. Việc phức tạp để dành phiên bản sau.** Không phải vì bản thân nó khó. Mà vì xây một thứ phức tạp trên một cái nền chưa được chứng minh là chắp vá, và sẽ phải làm lại. V1 phải ổn định trước để các phiên bản sau có chỗ dựa.

## 2. Trong V1

| Hạng mục | Trạng thái |
|---|---|
| Tám workflow backend nghiệp vụ | Đã xong, audit xác nhận |
| `backup_data` | Chưa làm, thuộc V1 |
| Layer desktop (Electron main): khởi động, chờ `READY`, dừng backend | Chưa làm, thuộc V1 |
| `reminder_ticker`, `native_dialogs` (thành phần cắt ngang của desktop) | Chưa làm, thuộc V1 |
| Giao diện React cho các tính năng đã xong | Chưa làm, phần lớn nhất của V1 |
| Đóng gói thành tệp thực thi độc lập cho Windows | Chưa làm, thuộc V1 |
| `restore_data` | Quyết sau khi nền tảng đã được chứng minh (mục 4) |

## 3. Để dành phiên bản sau — và vì sao

> **Cập nhật 2026-09-28** (`.design/product_versions.md`): theo lộ trình phiên bản mới, V2 là bản **củng cố và trải nghiệm dùng**, V3 là bản **thay diện mạo**, còn **watermark dời sang V4 trở đi**. Trong mục 3.1 và 3.2 dưới đây, mọi chỗ ghi "V2" nay đọc là "phiên bản làm watermark". Nội dung chuyên môn giữ nguyên.

### 3.1 Watermark ẩn

Ba workflow `apply_watermark`, `verify_watermark`, và toàn bộ `clause_c_ai_service` (`init_watermark_engine`, `embed_watermark`, `extract_watermark`).

**Lý do hoãn.** Không phải vì khó. Vì tới thời điểm này ta chưa có: engine đã chốt, tập ảnh thử đã chuẩn bị, kịch bản kiểm thử, và quy trình đo độ bền. Triển khai lúc chưa có bốn thứ đó là chắp vá.

**Trạng thái trong hợp đồng: không đổi.** Khung WCA chỉ cho phép ba giá trị `status` (`02-contract.md`, Bước 2.4), không có giá trị nào nghĩa là "để dành phiên bản sau". Ba workflow đó giữ `đang_chờ_triển_khai`, và giá trị ấy vẫn đúng. Hợp đồng mô tả hệ thống *là gì*; kế hoạch phát hành nói *khi nào làm cái gì*, và nó sống ở tệp này cùng `CLAUDE.md` mục 3.

**`manage_watermark_profile` là ngoại lệ đã xây xong.** Nó đã `đã_hoàn_thiện` từ phiên backend #6, đã ráp nối ở Order 4, các điểm giao tiếp `/watermark-profiles` đang chạy thật trên HTTP. Quyết định: **để nguyên, không tháo.** Tháo nó nghĩa là sửa một workflow đã hoàn thiện và sửa cả Main — thêm rủi ro mà không được gì, và V2 rồi cũng cần nó.

⚠ **Kèm theo là một ràng buộc cứng cho giao diện: V1 không được có màn hình hồ sơ quyền sở hữu.** Nếu có, họa sĩ sẽ điền bút danh, tên thật, thông tin liên hệ, câu tuyên bố quyền sở hữu — rồi những thứ đó không làm gì cả, vì chưa có tính năng nhúng. Đó là một niềm tin sai do chính ứng dụng tạo ra. Người làm giao diện sẽ thấy endpoint đó tồn tại và tưởng là cần làm, nên ràng buộc này phải được nhắc trong mọi plan giao diện.

**Không sửa `shared_values` liên quan watermark ở V1.** `watermark_payload_bits` giữ 48. Không dòng code nào hiện thực hóa nó nên nó không tốn gì, và V2 sẽ chốt con số ấy bằng số liệu đo thật thay vì suy luận trên giấy. (Phân tích sơ bộ đã có: 24–32 bit là đủ, vì mã watermark chỉ cần duy nhất trong số tác phẩm của chính họa sĩ, không phải duy nhất toàn cầu; phần bit dư ra đổi được thành độ bền. Cận dưới bị chặn bởi rủi ro nhận nhầm khi quét ảnh không có watermark.)

### 3.2 Những gì đã bàn cho V2 và nên giữ lại

Hai kết luận từ buổi bàn thiết kế watermark, lưu lại để V2 không phải bàn lại từ đầu:

**Hai mối đe dọa là hai bài toán khác bản chất, không phải hai mức độ khó.** Đăng lên nền tảng rồi tải về: hình học được giữ nguyên, watermark chỉ cần sống qua nén và mất tần số cao. Chụp màn hình rồi cắt cúp: hình học bị phá, bên giải mã mất đồng bộ về tỉ lệ và vị trí, cần nhúng lặp theo ô hoặc mẫu đồng bộ. V2 nên nhắm mối đe dọa thứ nhất cho chắc, và thiết kế sao cho việc nhúng lặp theo ô là thứ thêm vào được sau.

**Facebook là nơi kiểm chứng, không phải nơi tối ưu.** Cách một nền tảng xử lý ảnh đổi theo thời gian, theo đường đăng, theo kích thước ảnh. Nhưng mọi nền tảng đều làm cùng một họ thao tác: thu nhỏ, nén JPEG, lấy mẫu màu thưa, có khi làm nét. Thiết kế chống lại họ thao tác đó rồi dùng Facebook thật để kiểm chứng — như vậy Instagram gần như miễn phí, và sang năm nền tảng đổi quy trình thì không sập.

**Tranh vẽ kỹ thuật số là ca khó, và tập thử hiện tại lệch về phía dễ.** Gần như mọi phương pháp watermark đều được tinh chỉnh trên ảnh chụp, nơi có nhiễu cảm biến và vân bề mặt để giấu. Tranh digital tô phẳng thì vừa dễ lộ watermark hơn, vừa ít chỗ giấu hơn. Project Owner hiện có khoảng mười tranh giấy chụp lại và chỉ vài tranh digital. Khi đo: **tách riêng hai loại, không bao giờ gộp trung bình** — gộp sẽ cho con số đẹp giả tạo do nhóm tranh giấy kéo lên. Cần gom thêm tranh digital, trong đó phải có vài tấm tô phẳng nhiều.

**Ba mức `subtle` / `balanced` / `robust` trong hợp đồng chính là lối thoát.** Không cần ép tranh digital đạt cùng con số với tranh giấy. Cần đo cho ra ba mức đó thực sự tương ứng với cái gì trên từng loại tranh, rồi để họa sĩ chọn khi đã biết.

**Một câu hỏi V2 phải trả lời: ứng dụng nói gì khi watermark không sống sót?** `ERR_WATERMARK_SELF_CHECK_FAILED` chỉ chứng minh việc nhúng chạy đúng trên ảnh sạch; nó không nói gì về chuyện qua nền tảng có còn không. Nếu ứng dụng để họa sĩ tin rằng mình được bảo vệ trong khi không, thì tệ hơn là không có tính năng này.

### 3.3 Đã loại khỏi mọi phiên bản gần

Kiểm tra trùng lặp ảnh qua Internet (họa sĩ tự cam kết nguyên tác). Làm mù AI chống train. Chịu được việc chụp lại màn hình bằng máy ảnh khác. Đồng bộ online. Nhiều người dùng.

## 4. Ranh giới còn mở, chưa quyết

**`restore_data`.** Nó phải dừng backend, thay tệp cơ sở dữ liệu, khởi động lại, và hoàn tác nguyên trạng nếu hỏng giữa đường — việc phức tạp nhất trong nhóm còn lại của V1. Theo ưu tiên 2 và 3, nó không thuộc phần đầu của V1. Có một dạng đơn giản hơn nhiều đáng cân nhắc: ứng dụng kiểm tra tệp sao lưu, chuẩn bị nó sẵn, rồi bảo họa sĩ đóng và mở lại ứng dụng để hoàn tất — bỏ hẳn phần điều phối vòng đời tiến trình. Dạng đó là thay đổi hợp đồng, nên chỉ nêu ra ở đây, chưa đề xuất. **Quyết sau khi nền tảng đã được chứng minh.**

**Cách giao việc cho giao diện — đã có lời giải (2026-09-26).** Giao diện vẫn nằm ngoài mọi Điều khoản của hợp đồng (lý thuyết §7), nhưng bên trong được tổ chức theo **iWCA** (skill `iwca-implementation`): phân khu logic áp nguyên WCA nên dùng lại được plan, checkpoint và kiểm thử; phân khu kit và phân khu màn hình có luật riêng, được máy kiểm; bằng chứng là lệnh `check` cộng kịch bản bấm thử mà Project Owner tự chạy. Còn lại một phần nhỏ phải viết trước phiên giao diện đầu tiên: phần vận hành cho layer giao diện trong `08-operating-protocol.md` (xem `.plan/v1_roadmap.md`, chặng A).

## 5. Tệp này dùng thế nào

Mọi plan của phiên phải nằm trong ranh giới ở mục 2 và 3. Một phiên muốn làm gì ngoài ranh giới đó thì phải sửa tệp này trước, và việc sửa cần Project Owner đồng ý. Lộ trình cụ thể theo thứ tự: `.plan/v1_roadmap.md`.
