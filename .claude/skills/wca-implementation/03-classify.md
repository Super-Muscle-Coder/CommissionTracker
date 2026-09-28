# GIAI ĐOẠN 3 — PHÂN LOẠI CHÍNH THỨC TỪNG WORKFLOW

*Giai đoạn thứ tư trong quy trình triển khai WCA, sau khi đã hoàn thành [Giai đoạn 2](02-contract.md). Xem [SKILL.md](SKILL.md) để biết toàn bộ các giai đoạn. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại [§0 của lý thuyết](wca_theory_compressed.md).*

| | |
|---|---|
| **Input** | Danh sách workflow đã có hợp đồng tối cao đầy đủ từ Giai đoạn 2, bao gồm `input_expected` và `output_guaranteed` của từng workflow. |
| **Hành động** | Xác nhận chính thức phân loại nền tảng/nghiệp vụ cho từng workflow, xác định thứ tự khởi tạo nếu có nhiều workflow nền tảng, và xác định rõ các lớp cần có cho từng workflow. |
| **Output** | Mỗi workflow có nhãn phân loại chính thức, không còn ở trạng thái tạm thời; nếu là nền tảng, có vị trí rõ ràng trong thứ tự khởi tạo và xác nhận rõ có cần Routers hay không. |

## Bước 3.1 — Xác nhận lại phân loại bằng cách tra cứu hợp đồng, không đoán mò

Phân loại ở Giai đoạn 1 đã dựa trên một quá trình phân tích thật sự, nhưng vẫn cần xác nhận lại ở đây bằng một phép thử nghiêm ngặt hơn — vì việc phân định ranh giới một workflow (Giai đoạn 1) và việc đánh giá đúng vị trí của nó trong toàn hệ thống (giai đoạn này) là hai câu hỏi khác nhau.

Phép thử: hình dung việc gỡ bỏ hoàn toàn workflow này khỏi hệ thống, rồi tự hỏi hậu quả thực sự là gì. Đây không cần dừng lại ở việc hình dung trừu tượng — hợp đồng từ Giai đoạn 2 đã ghi sẵn dữ liệu cụ thể để tra cứu: quét toàn bộ `input_expected` của mọi workflow khác, tìm những workflow nào có `from` trỏ vào tên workflow đang xét. Danh sách tìm được chính là những workflow thực sự bị ảnh hưởng nếu workflow này biến mất — không cần đoán, có thể tra ra trực tiếp. Phép tra này chỉ đúng khi hợp đồng đã khai báo đủ hai chiều, kể cả với tài nguyên nền tảng (xem [Giai đoạn 2](02-contract.md), phần giá trị của `from`); nếu tra ra một chiều bị thiếu, sửa hợp đồng trước rồi mới kết luận.

⚠ Có tìm được danh sách bị ảnh hưởng vẫn CHƯA đủ để kết luận phân loại — phải phân biệt tiếp hai loại hậu quả hoàn toàn khác bản chất:

**Loại thứ nhất — mất khả năng tồn tại.** Các workflow trong danh sách đó không còn cách nào để được Main khởi tạo, bất kể chúng có được gọi tới hay không. Đây là dấu hiệu của workflow nền tảng.

**Loại thứ hai — mất khả năng vận hành đúng khi được gọi.** Các workflow trong danh sách đó vẫn khởi tạo và tồn tại bình thường, nhưng khi được kích hoạt, chúng gặp lỗi hoặc không có gì để xử lý vì thiếu đúng input đã mong muốn. Đây vẫn là workflow nghiệp vụ, dù số lượng workflow bị ảnh hưởng có nhiều tới đâu.

Một workflow nghiệp vụ hoàn toàn có thể là nơi rất nhiều workflow khác phụ thuộc vào output của nó — khiến việc gỡ nó trông có vẻ gây ảnh hưởng lan rộng không kém gì một workflow nền tảng thật sự. Quy mô ảnh hưởng không phải tiêu chí phân loại; bản chất của sự phụ thuộc — tồn tại hay chỉ vận hành — mới là điều phân định. Đây là bước dễ mắc lỗi chủ quan nhất trong toàn bộ quy trình: sự thiên vị tự nhiên khi vừa thiết kế xong một workflow, hoặc khi thấy nó có quá nhiều nơi phụ thuộc vào mình, là đánh giá nó "quan trọng" tới mức nền tảng — nhưng "quan trọng, có nhiều nơi phụ thuộc" và "là điều kiện tiên quyết để hệ thống khởi động" là hai khái niệm khác nhau.

## Bước 3.2 — Thiết lập thứ tự khi có nhiều hơn một workflow nền tảng

Nếu Bước 3.1 xác nhận hệ thống có nhiều hơn một workflow nền tảng, cần xác định rõ chúng phải khởi tạo theo thứ tự nào, vì việc khởi tạo song song hay tùy ý có thể khiến một workflow nền tảng cố gắng sử dụng một tài nguyên mà một workflow nền tảng khác chưa kịp chuẩn bị xong.

Với mỗi cặp workflow nền tảng, tự hỏi liệu một trong hai có đang cần một kết quả, một tài nguyên, một trạng thái đã sẵn sàng mà chỉ cái còn lại mới tạo ra được — tra cứu ngay trong `input_expected`/`output_guaranteed` của cả hai để xác nhận, không cần đoán. Nếu có một mối quan hệ phụ thuộc như vậy, thứ tự khởi tạo phải phản ánh đúng chiều phụ thuộc đó. Nếu không tìm thấy mối quan hệ phụ thuộc nào giữa một cặp cụ thể, chúng độc lập với nhau, và thứ tự giữa riêng cặp đó không quan trọng.

Trong hệ thống nhiều layer, thứ tự được xét ở hai cấp khác nhau, không trộn lẫn. **Bên trong một layer**, thứ tự giữa các workflow nền tảng được tra từ hợp đồng như trên. **Giữa các layer**, việc layer nào khởi động trước, layer nào chờ layer nào sẵn sàng là việc quản lý vòng đời của Main ở layer được khởi động đầu tiên, dựa trên tín hiệu sẵn sàng giữa các Main (xem [§4 của lý thuyết](wca_theory_compressed.md)), không phải một quan hệ phụ thuộc giữa các workflow. Một giá trị mà Main sinh ra lúc chạy rồi truyền cho layer khác (ví dụ một cổng mạng còn trống) là `environment_config` đối với bên nhận, không phải một phụ thuộc vào workflow nào — vì vậy nó không tạo ra vòng phụ thuộc.

⚠ Nếu quá trình tra cứu phát hiện workflow nền tảng A mong muốn nhận điều gì đó từ B, trong khi B lại mong muốn nhận điều gì đó từ A — không có thứ tự tuyến tính nào giải quyết được tình huống này. Đây không phải một bài toán "chọn thứ tự cho khéo" ở bước này — đây là tín hiệu cho thấy ranh giới giữa hai workflow đã bị vẽ sai ngay từ Giai đoạn 1. Quay lại Giai đoạn 1, xem xét lại liệu hai workflow này có nên gộp làm một, hay ranh giới giữa chúng cần được vẽ lại theo một cách khác, không cố tìm một thứ tự "tạm ổn" để né tránh vấn đề thật.

## Bước 3.3 — Xác định các lớp cần có cho từng workflow nền tảng

Không phải mọi workflow nền tảng đều cần đủ cả năm lớp như một workflow nghiệp vụ (xem [§4 của lý thuyết](wca_theory_compressed.md)). Với mỗi workflow nền tảng, xem xét lại chính mục đích tồn tại của nó: nó chỉ phục vụ đúng quá trình khởi tạo, không phục vụ một yêu cầu nghiệp vụ lặp lại nào. Với từng lớp, tự hỏi việc chuẩn bị có thực sự cần lớp đó không — không tạo một lớp chỉ để cho đủ, nhưng cũng không bỏ một lớp đang có việc để làm. Riêng Services: nếu việc chuẩn bị có một quyết định cần đưa ra, dù nhỏ, nó cần Services; nếu chỉ là một chuỗi thao tác kỹ thuật cố định, Adapters là đủ.

Từ đó, tự hỏi riêng cho lớp Routers: sau khi hệ thống đã khởi động xong, có bất kỳ ai hoặc bất kỳ điều gì cần gọi lại workflow nền tảng này một lần nữa không, dưới hình thức lặp lại nhiều lần? Nếu câu trả lời là không — nó chỉ chạy đúng một lần rồi thôi — thì không cần một lớp Routers riêng, điểm kích hoạt của nó nằm ngay trong Main. Nếu có một workflow hay một thành phần hạ tầng cắt ngang thực sự cần gọi lại nó sau khi khởi động (ví dụ yêu cầu nạp lại tài nguyên đã chuẩn bị), đây là dấu hiệu cần một lớp Routers tối giản, chỉ phục vụ đúng nhu cầu đó — và điểm giao tiếp đó, như mọi điểm giao tiếp có bên ngoài gọi tới, phải có mặt trong API Contract.

⚠ Nhu cầu "Main của layer khác cần biết layer này đã sẵn sàng chưa" **không** phải lý do để có Routers. Một layer chỉ sẵn sàng khi Main của nó đã ráp nối xong mọi workflow — điều mà Routers của một workflow nền tảng không thể biết. Đó là tín hiệu sẵn sàng giữa Main với Main (xem [§4 của lý thuyết](wca_theory_compressed.md)), được giải quyết ở [Giai đoạn 4](04-implement.md), Bước 4.5.

## Bước 3.4 — Xác nhận đủ năm lớp cho từng workflow nghiệp vụ

Với mỗi workflow đã được xác nhận là nghiệp vụ thông thường ở Bước 3.1, không có ngoại lệ nào cho phép nó thiếu một trong năm lớp — bao gồm cả Routers. ⚠ Đây là điểm khác biệt tuyệt đối, không thỏa hiệp, giữa workflow nghiệp vụ và workflow nền tảng: workflow nền tảng có thể không cần Routers, nhưng workflow nghiệp vụ thì luôn cần, bất kể điểm kích hoạt của nó mang hình thức gì.

Cần phân biệt rõ: "có Routers" và "có một điểm giao tiếp qua mạng" không phải luôn là một. Một workflow nghiệp vụ chỉ được kích hoạt từ bên trong hệ thống (bởi một workflow khác hay bởi hạ tầng cắt ngang) vẫn cần một lớp Routers đóng đúng vai trò "điểm tiếp nhận duy nhất" — chỉ là hình thức của nó đi theo vị trí của bên gọi: một hàm được gọi trực tiếp khi bên gọi nằm cùng tiến trình, một điểm giao tiếp qua mạng hay qua kênh liên tiến trình khi bên gọi nằm ở tiến trình khác. Đây chính là biểu hiện cụ thể của "hình thức linh hoạt tùy bối cảnh" đã nêu ở [§4 của lý thuyết](wca_theory_compressed.md), không phải một loại Routers khác biệt.

Nếu trong lúc rà soát phát hiện một workflow nghiệp vụ có vẻ như không cần một lớp nào đó, đây là dấu hiệu cần quay lại Bước 3.1 để xác nhận lại phân loại của nó, thay vì mặc nhiên bỏ qua lớp đó.

**Checklist:**

- [ ] **Đã tra cứu hợp đồng (không đoán) để tìm mọi workflow có `from` trỏ tới workflow đang xét, trước khi kết luận phân loại.**
- [ ] **Với mỗi workflow bị ảnh hưởng tìm được, đã phân biệt rõ đây là mất khả năng TỒN TẠI (dấu hiệu nền tảng) hay chỉ mất khả năng VẬN HÀNH ĐÚNG khi được gọi (vẫn là nghiệp vụ, dù số lượng ảnh hưởng nhiều).**
- [ ] Mọi workflow đều đã được xác nhận chính thức là nền tảng hoặc nghiệp vụ, không còn ở trạng thái tạm thời.
- [ ] Nếu có nhiều hơn một workflow nền tảng, đã xác định rõ thứ tự khởi tạo giữa chúng bằng cách tra cứu hợp đồng — và nếu phát hiện phụ thuộc vòng, đã quay lại Giai đoạn 1 thay vì cố tìm một thứ tự tạm ổn.
- [ ] Trong hệ thống nhiều layer, đã tách bạch thứ tự giữa các workflow nền tảng trong cùng một layer (tra hợp đồng) với thứ tự khởi động giữa các layer (việc của Main).
- [ ] Với mỗi workflow nền tảng, đã xác nhận rõ có cần một lớp Routers riêng hay không, kèm lý do; nếu có, điểm giao tiếp của nó đã có mặt trong API Contract.
- [ ] Một input `from: main` (công cụ quản lý vòng đời do Main trao) không tạo phụ thuộc vào workflow nền tảng nào, nên không ảnh hưởng tới phân loại hay thứ tự khởi tạo.
- [ ] Với mỗi workflow nghiệp vụ, đã xác nhận sẽ có đủ năm lớp, không thiếu bất kỳ lớp nào — kể cả khi điểm kích hoạt của nó không đi qua mạng.

⚠ Quy tắc quay lui: nếu trong lúc triển khai ở [Giai đoạn 4](04-implement.md) phát hiện một workflow đã bị phân loại sai, quay lại Giai đoạn 3, thực hiện lại Bước 3.1 cho workflow đó. Nếu phát hiện phụ thuộc vòng giữa hai workflow nền tảng, quay lại Giai đoạn 1.

---

## Minh họa — áp dụng vào hệ thống đặt lịch hẹn

⚠ Lưu ý trước khi đọc phần này: hệ thống đặt lịch hẹn dưới đây chỉ có một workflow nền tảng duy nhất, nên Bước 3.2 (thứ tự khởi tạo khi có nhiều workflow nền tảng, và xử lý phụ thuộc vòng) không có gì để minh họa cụ thể — điều đó không có nghĩa bước này kém quan trọng, chỉ đơn giản là bài toán nhỏ này không rơi vào tình huống cần áp dụng nó.

**Bước 3.1:** Tra cứu hợp đồng — `output_guaranteed.db_connection` của `scaffold` có `consumed_by: [book_appointment, send_reminder]`. Nếu gỡ `scaffold`, cả hai workflow này không có kết nối để khởi tạo — mất khả năng TỒN TẠI. Xác nhận: nền tảng.

Tra cứu tiếp `output_guaranteed.appointment` của `book_appointment` có `consumed_by: [send_reminder]`. Nếu gỡ `book_appointment`, `send_reminder` vẫn khởi tạo và tồn tại bình thường — chỉ là khi chạy, nó không còn lịch hẹn nào để đọc, mất khả năng VẬN HÀNH ĐÚNG, không phải mất khả năng tồn tại. Xác nhận: nghiệp vụ, dù `send_reminder` phụ thuộc trực tiếp vào output của nó.

Tương tự, gỡ `send_reminder` không ảnh hưởng gì tới khả năng tồn tại của `book_appointment` hay `scaffold`. Xác nhận: nghiệp vụ.

**Bước 3.2:** Chỉ có một workflow nền tảng (`scaffold`), không cần xác định thứ tự hay kiểm tra phụ thuộc vòng.

**Bước 3.3:** Với `scaffold`, tự hỏi có ai cần gọi lại nó nhiều lần sau khi hệ thống đã khởi động không — không. Xác nhận: `scaffold` không cần lớp Routers.

**Bước 3.4:** `book_appointment` và `send_reminder` đều là workflow nghiệp vụ, cả hai đều cần đủ năm lớp. Với `book_appointment`, Routers có hai điểm giao tiếp mang hai hình thức cùng lúc: một điểm HTTP cho người dùng đặt lịch, và một hàm gọi trực tiếp để `background_jobs` lấy lịch hẹn sắp tới — cả hai vẫn là cùng một lớp Routers. Với `send_reminder`, Routers vẫn tồn tại — mang hình thức một hàm được gọi trực tiếp bởi cơ chế quét định kỳ `background_jobs` (xem Giai đoạn 5), không phải một điểm giao tiếp HTTP — và vì có bên ngoài workflow gọi tới, điểm giao tiếp đó được khai báo trong API Contract với `form: in_process`.

**Kết quả áp dụng, đầu ra của Giai đoạn 3 cho ví dụ này:**

| Workflow | Layer | Phân loại chính thức | Thứ tự khởi tạo | Có cần Routers | Hình thức Routers |
|---|---|---|---|---|---|
| `scaffold` | backend | Nền tảng | Duy nhất, chạy trước mọi workflow nghiệp vụ | Không | — |
| `book_appointment` | backend | Nghiệp vụ | — | Có | Điểm giao tiếp HTTP (cho người dùng) và hàm gọi trực tiếp (cho `background_jobs`) |
| `send_reminder` | backend | Nghiệp vụ | — | Có | Hàm được gọi trực tiếp bởi cơ chế quét định kỳ |