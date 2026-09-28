# GIAI ĐOẠN 0 — CHUẨN BỊ

*Giai đoạn đầu tiên trong quy trình triển khai WCA. Xem [SKILL.md](SKILL.md) để biết toàn bộ các giai đoạn. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại [§0 của lý thuyết](wca_theory_compressed.md).*

| | |
|---|---|
| **Input** | Đề bài thô (mô tả hệ thống bằng ngôn ngữ tự nhiên). |
| **Hành động** | Đọc kỹ lý thuyết nền WCA — tệp [wca_theory_compressed.md](wca_theory_compressed.md), được tài liệu nền của dự án (ví dụ `CLAUDE.md`) dẫn tới — trước khi tiếp tục. |
| **Output** | Một sự hiểu biết đủ vững về WCA để có thể tự giải thích lại bản chất của từng thành phần cho người khác, không chỉ nhớ được định nghĩa. |

## Cách tự kiểm tra đã hiểu đủ vững hay chưa

Đây không phải bước trả lời một danh sách câu hỏi cố định cho có, mà là một bước tư duy: sau khi đọc xong phần lý thuyết, tự đặt mình vào vị trí phải giải thích lại toàn bộ kiến trúc này cho một người hoàn toàn chưa biết gì, và tự hỏi liệu mình có thể làm được điều đó một cách rành mạch, nắm được bản chất của từng thành phần đã học — hợp đồng tối cao, Main, workflow nền tảng, workflow nghiệp vụ, từng lớp trong năm lớp, và hạ tầng cắt ngang — mà không cần đoán mò hay chắp vá.

⚠ Cần phân biệt rõ hai điều khác nhau: quên một chi tiết nhỏ (ví dụ tên chính xác của một trường trong một ví dụ) và không nắm được bản chất của một nguyên lý. Loại thứ nhất là điều bình thường, không có nghĩa là chưa hiểu vững — hoàn toàn có thể quay lại tra cứu chi tiết đó bất cứ lúc nào cần. Loại thứ hai mới là dấu hiệu thật sự đáng lo: nếu không thể giải thích được VÌ SAO một ràng buộc tồn tại, hay không thể tự suy luận cách xử lý một tình huống mới dựa trên nguyên lý đã học, đây là lúc cần đọc lại kỹ hơn, không phải chỉ tra một chi tiết rồi tiếp tục.

Với mỗi thành phần, phép thử tự nhiên nhất là: nếu phải giải thích ranh giới trách nhiệm của thành phần này cho một người mới, mình có thể nói được không chỉ nó LÀM gì, mà còn nó KHÔNG được phép làm gì? Một sự hiểu biết chỉ dừng ở "nó làm gì" thường chưa đủ vững — phần ranh giới cấm đoán mới là nơi hầu hết các lỗi triển khai thực tế xảy ra.

Một dấu hiệu khác cho thấy sự hiểu biết chưa đủ vững: nếu gặp một tình huống mới, chưa từng thấy ví dụ trong phần lý thuyết, mà không thể tự suy luận ra nó nên xử lý theo nguyên lý nào — đây là lúc cần quay lại đọc kỹ hơn phần nguyên lý cốt lõi (không chỉ đọc lại ví dụ), vì ví dụ chỉ minh họa cho nguyên lý, không thay thế được nguyên lý.

Riêng phần thuật ngữ ([§0 của lý thuyết](wca_theory_compressed.md)) là ngoại lệ của nguyên tắc "quên chi tiết là bình thường" ở trên: các thuật ngữ đó là ngôn ngữ chung giữa mọi tác nhân làm việc trên cùng một dự án, nên phải dùng đúng nghĩa đã định — đặc biệt là phân biệt "lớp" (bên trong một workflow) với "layer hệ thống" (nơi các workflow chạy). Dùng lẫn hai từ này trong một báo cáo hay một checkpoint là đủ để agent khác hiểu sai.

⚠ Không chuyển sang [Giai đoạn 1](01-decompose.md) khi việc tự giải thích bản chất của một thành phần bất kỳ còn vấp váp, phải đoán mò, hoặc không thể tự suy luận cách xử lý một tình huống mới dựa trên nguyên lý đã học.

---

## Minh họa — một số câu hỏi mẫu để hình dung cách tự kiểm, KHÔNG PHẢI danh sách bắt buộc phải trả lời hết

⚠ Lưu ý trước khi đọc phần này: những câu hỏi dưới đây chỉ là ví dụ cho thấy DẠNG câu hỏi nên tự đặt ra, không phải một bài kiểm tra đóng cần trả lời đủ và đúng từng câu. Một agent hiểu vững có thể tự nghĩ ra những câu hỏi hoàn toàn khác, phù hợp hơn với chính cách nó tiếp cận vấn đề, và điều đó hoàn toàn chấp nhận được — mục tiêu cuối cùng là sự hiểu biết vững chắc, không phải việc trả lời đúng những câu hỏi mẫu này.

- Nếu xóa một workflow nền tảng, hệ thống có còn chạy được không? Vì sao?
- Nếu xóa một workflow nghiệp vụ mà nhiều workflow khác đang phụ thuộc vào dữ liệu đầu ra của nó, điều đó có tự động biến nó thành workflow nền tảng không? Vì sao?
- Vì sao Entities không được chứa hàm xử lý logic?
- Nếu hai workflow cần dùng chung một đoạn xử lý, cách xử lý đúng phụ thuộc vào điều gì?
- Routers có bắt buộc phải là một điểm giao tiếp qua mạng (ví dụ HTTP) không?
- Một tác vụ chạy nền, không cần hoàn thành ngay lập tức, nên đặt ở đâu trong cấu trúc này — và phần nào của nó vẫn phải là một workflow?
- Vì sao không được viết code trước khi có hợp đồng tối cao?
- Khi workflow A cần dữ liệu do workflow B tạo ra, lời gọi đi qua lớp nào của A, tới lớp nào của B, và vì sao A không được dùng lại Entities của B?
- Một con số như "số lần thử lại tối đa" có cần xuất hiện trong hợp đồng không? Còn "độ dài một mã mà hai layer cùng phải hiểu" thì sao?
- Việc khởi động một tiến trình khác của hệ thống thuộc về Main hay thuộc về một workflow?
- Workflow nền tảng mở kết nối tới cơ sở dữ liệu. Vậy ai tạo các bảng chứa dữ liệu của từng workflow nghiệp vụ?
- Một kiểm tra như "khách hàng này có tồn tại không" thuộc Routers hay Services? Còn "trường này có phải là số không" thì sao?