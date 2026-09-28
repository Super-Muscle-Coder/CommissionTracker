# GIAI ĐOẠN 5 — TRƯỜNG HỢP ĐẶC BIỆT: LOGIC DÙNG CHUNG, XỬ LÝ BẤT ĐỒNG BỘ, THAO TÁC CẤP KHO LƯU TRỮ

*Giai đoạn phát sinh theo tình huống, không phải một giai đoạn tuần tự cố định — chỉ ghé qua đây khi thực sự gặp đúng tình huống mô tả bên dưới. Thường gặp nhất trong lúc [Giai đoạn 4](04-implement.md), nhưng có thể sớm hơn, ngay từ Giai đoạn 1–2, khi tình huống đó ảnh hưởng tới hình dạng hợp đồng (ví dụ: ai kích hoạt một tác vụ chạy theo thời gian quyết định điểm giao tiếp nào cần khai báo). Xem [SKILL.md](SKILL.md) để biết toàn bộ các giai đoạn. Thuật ngữ dùng trong tệp này theo đúng định nghĩa tại [§0 của lý thuyết](wca_theory_compressed.md).*

| | |
|---|---|
| **Input** | Một tình huống phát sinh — phát hiện cần dùng lại logic đã có ở workflow khác, cần xử lý một tác vụ không cần hoàn thành ngay lập tức, hoặc cần thao tác trên toàn bộ một nơi lưu trữ. |
| **Hành động** | Đánh giá đúng bản chất tình huống, đưa ra một quyết định tổ chức phù hợp, theo các bước tư duy bên dưới. |
| **Output** | Một quyết định rõ ràng về nơi đặt đoạn logic hoặc tác vụ đó, kèm lý do, rồi quay lại đúng giai đoạn đang dừng. |

## Bước 5.1 — Phân biệt "cần dùng lại" với "cần chia sẻ mãi mãi"

Khi phát hiện một đoạn xử lý giống hoặc gần giống một đoạn đã tồn tại ở workflow khác, phản xạ thường thấy là ngay lập tức nghĩ tới việc tạo ra một nơi dùng chung để tránh viết lại — đây chính là bản năng DRY (không lặp lại chính mình) quen thuộc trong lập trình thông thường. WCA đòi hỏi kháng lại đúng bản năng đó ở ranh giới giữa các workflow, vì lý do cụ thể sau.

Đặt câu hỏi quan trọng nhất của toàn bộ giai đoạn này: hai đoạn xử lý giống nhau hôm nay có chắc sẽ luôn giống nhau mãi mãi không, hay chúng chỉ tình cờ trùng khớp ở thời điểm hiện tại vì cùng đang giải quyết một vấn đề tương tự? Hai workflow độc lập, dù đang có logic giống hệt nhau, vẫn có thể cần thay đổi theo hai hướng khác nhau trong tương lai, vì bản chất nghiệp vụ của chúng vốn dĩ tách biệt. Một khi đã tạo ra một nơi dùng chung, cả hai workflow đó bị buộc phải cùng thay đổi theo mọi lúc, dù nghiệp vụ có đòi hỏi điều đó hay không — đây chính là cái giá phải trả nếu đánh giá sai ở bước này.

## Bước 5.2 — Xác định phạm vi thực sự của sự trùng lặp: nội bộ một workflow, hay giữa nhiều workflow

Trước khi quyết định có nên chấp nhận trùng lặp hay không, cần xác định chính xác ranh giới đang xét là ở đâu. Nếu hai đoạn xử lý giống nhau đều thuộc về cùng một workflow duy nhất — chỉ là hai hành động khác nhau bên trong cùng một hành động nghiệp vụ lớn hơn — việc dùng chung một đoạn xử lý là hoàn toàn tự nhiên, không đi ngược lại nguyên tắc cô lập nào cả, vì nguyên tắc đó chỉ áp dụng cho ranh giới giữa các workflow khác nhau.

Chỉ khi sự trùng lặp thực sự vượt qua ranh giới của hai workflow riêng biệt, câu hỏi ở Bước 5.1 mới thực sự cần thiết.

## Bước 5.3 — Nếu xác nhận cần chia sẻ thật, đánh giá bản chất của đoạn logic đó trước khi quyết định vị trí

Nếu sau khi cân nhắc kỹ ở Bước 5.1, xác nhận rằng đoạn xử lý đó thực sự nên giống nhau mãi mãi giữa hai workflow, bước tiếp theo là đánh giá xem đoạn xử lý đó có mang bất kỳ giả định nào về nghiệp vụ cụ thể hay không, hay nó thuần túy là một thao tác kỹ thuật không gắn với bất kỳ khái niệm nghiệp vụ nào.

⚠ Hai điều kiện dưới đây phải cùng đúng thì mới nên gộp thành một vị trí dùng chung — thiếu một trong hai, quay lại chấp nhận trùng lặp như đã bàn ở Bước 5.1:

1. Đoạn xử lý chắc chắn sẽ giống nhau mãi mãi giữa các workflow liên quan (đã xác nhận ở Bước 5.1).
2. Đoạn xử lý hoàn toàn trung lập về nghiệp vụ, không mang dù chỉ một phần dấu vết của một khái niệm nghiệp vụ cụ thể.

Khi cả hai điều kiện cùng đúng, đoạn xử lý được đặt ở vị trí dùng chung **của layer** (mặc định `<layer>/shared/`, xem [Giai đoạn 4](04-implement.md), Bước 4.0) — không nằm trong thư mục của bất kỳ workflow nào, để không workflow nào "sở hữu" nó. Vị trí dùng chung không bao giờ vượt qua ranh giới layer hệ thống: hai layer khác nhau không dùng chung code; điều duy nhất chúng dùng chung là hợp đồng (ví dụ `shared_values`).

## Bước 5.4 — Đánh giá một tác vụ có khớp với mô hình tiếp nhận và phản hồi ngay hay không

Với một tình huống khác — phát hiện cần thực hiện một hành động không cần hoàn thành trước khi trả kết quả lại cho người yêu cầu — cần đặt câu hỏi về bản chất thời gian của tác vụ đó, tách biệt hoàn toàn khỏi câu hỏi về logic dùng chung đã bàn ở trên.

Cấu trúc năm lớp được thiết kế cho một luồng xử lý có hình dạng cố định — tiếp nhận, xử lý, trả kết quả, tất cả diễn ra trong cùng một nhịp. Một tác vụ không cần hoàn thành ngay, có thể chạy độc lập sau khi người yêu cầu đã nhận được phản hồi, mang một hình dạng thời gian khác hẳn, và việc cố ép cả tác vụ — kể cả phần quyết định *khi nào* nó chạy — vào nhịp của một lượt gọi workflow thường dẫn tới việc phải giả vờ nó "đã xong" trong khi thực chất chưa, hoặc bắt người dùng chờ đợi không cần thiết.

Nếu xác nhận tác vụ đó thực sự không khớp với mô hình tiếp nhận-xử lý-trả kết quả ngay, cần tách nó làm hai phần có bản chất khác nhau:

- **Phần kích hoạt** — quyết định *khi nào* tác vụ chạy (theo thời gian, theo sự kiện) và chuyển dữ liệu tới nơi xử lý. Phần này không khớp nhịp của một workflow, nên nó cần một không gian tổ chức khác, đứng ngoài mọi workflow — gọi là hạ tầng cắt ngang (xem [§5 của lý thuyết](wca_theory_compressed.md)).
- **Phần công việc** — việc nghiệp vụ mà tác vụ thực sự làm khi được kích hoạt (quyết định gì, ghi gì, gửi gì). Phần này vẫn là một workflow nghiệp vụ đủ năm lớp, với điểm giao tiếp được hạ tầng cắt ngang gọi tới. Tác vụ chạy theo thời gian không phải lý do để đưa logic nghiệp vụ ra khỏi workflow.

Có một tình huống gần giống cần nhận diện riêng: bên ngoài hệ thống (ví dụ phần giao diện đặt ngoài WCA) cần một việc **trình bày** mà chỉ một layer theo WCA làm được — như mở hộp thoại chọn tệp của hệ điều hành. Việc đó không có quyết định nghiệp vụ, không chạm vào dữ liệu của workflow nào, nên không phải một workflow; nó là hạ tầng cắt ngang ở vai bên được gọi. Tự hỏi: việc này có thực sự chỉ là trình bày không, hay nó bắt đầu chọn, lọc, hay ghi lại điều gì mang ý nghĩa nghiệp vụ? Nếu chỉ là trình bày, lối vào của nó được khai báo trong `entries` của thành phần đó (xem [Giai đoạn 2](02-contract.md)); dữ liệu nó trả về đi vào workflow sau đó như dữ liệu từ bên ngoài hệ thống, qua điểm giao tiếp của chính workflow. Nếu không, đó là dấu hiệu cần một workflow.

## Bước 5.5 — Phân định rõ ai khởi kích và ai sở hữu một tác vụ chạy ngoài nhịp của workflow

Sau khi đã tách phần kích hoạt của tác vụ ra hạ tầng cắt ngang, một nhầm lẫn thường gặp là để nguyên phần công việc của tác vụ đó nằm lẫn trong workflow đã khởi kích nó, hoặc nằm lẫn trong chính hạ tầng cắt ngang. Cần phân định rạch ròi hai vai trò khác nhau: workflow nào là nơi ra lệnh cho tác vụ đó bắt đầu chạy (khởi kích), và tác vụ đó thực chất phục vụ mục đích gì, thuộc trách nhiệm nghiệp vụ của workflow nào (sở hữu). Một workflow hoàn toàn có thể là nơi khởi kích một tác vụ, mà không sở hữu logic bên trong tác vụ đó. Bên khởi kích cũng có thể không phải một workflow nào, mà chỉ là thời gian trôi qua (một lượt quét định kỳ). Khi bên khởi kích là một workflow, nó giao việc cho hạ tầng cắt ngang qua Adapters của mình (ví dụ đặt một mục vào hàng đợi) — một thao tác kỹ thuật như mọi thao tác ra bên ngoài khác; dữ liệu nó giao đi được khai báo trong hợp đồng như một output mà workflow sở hữu tác vụ tiêu thụ, qua đường push có hạ tầng cắt ngang chuyển tiếp (xem [Giai đoạn 2](02-contract.md)).

⚠ Ràng buộc quan trọng nhất của bước này, không có ngoại lệ, không có trường hợp đặc biệt: hạ tầng cắt ngang, dù đứng ngoài mọi workflow, vẫn KHÔNG được phép đi tắt thẳng vào Entities, Adapters, hay Services nội bộ của bất kỳ workflow nào để lấy dữ liệu hay kích hoạt xử lý. Đúng nguyên tắc "Routers là điểm nhận kích hoạt hợp lệ duy nhất" đã học — nguyên tắc này áp dụng cho MỌI bên gọi tới một workflow, không chỉ riêng các workflow chính thức khác, và không phụ thuộc vào việc tác vụ đó chạy đồng bộ, bất đồng bộ, hay theo chu kỳ định sẵn. Mỗi workflow là một hệ sinh thái đóng kín — giống như các phòng ban trong cùng một công ty, dù làm việc chung một tòa nhà, mọi giao tiếp vẫn phải đi qua đúng người phụ trách, không có cửa sau nào khác.

Nếu hạ tầng cắt ngang cần dữ liệu mà một workflow khác sở hữu, nó phải đi qua đúng điểm giao tiếp chính thức mà workflow đó đã công bố trong hợp đồng — dù dữ liệu đó có nằm trong cùng một cơ sở dữ liệu vật lý với dữ liệu khác hay không, việc đó không tạo ra bất kỳ ngoại lệ nào cho phép đọc thẳng. Chỉ khi dữ liệu cần lấy thực sự không thuộc quyền sở hữu của bất kỳ workflow nào (ví dụ một danh mục tĩnh, dữ liệu hạ tầng thuần túy — khai báo với `from: storage_layer` trong hợp đồng), việc đọc trực tiếp từ nơi lưu trữ mới hợp lệ. Nếu dữ liệu đó là output do một workflow cụ thể tạo ra, dù hạ tầng cắt ngang có kỹ thuật để đọc thẳng cơ sở dữ liệu hay không, nó vẫn bắt buộc phải đi qua đúng điểm giao tiếp của workflow sở hữu — không có ngoại lệ cho lý do "tiện lợi kỹ thuật" hay "cùng chung hạ tầng lưu trữ".

Hạ tầng cắt ngang có phạm vi được phép hẹp và rõ ràng (xem [§5 của lý thuyết](wca_theory_compressed.md)): nó quyết định **khi nào** gọi, và **chuyển** kết quả đi đâu — không quyết định **cái gì** là đúng về mặt nghiệp vụ. Nếu thấy thành phần hạ tầng cắt ngang bắt đầu lọc dữ liệu theo ý nghĩa nghiệp vụ, chọn phần tử nào cần xử lý, hay tính toán dựa trên dữ liệu nghiệp vụ, phần logic đó đang bị đặt sai chỗ — nó thuộc Services của một workflow.

Một thành phần hạ tầng cắt ngang có thể chạy ở bất kỳ layer hệ thống nào phù hợp với việc nó làm (ví dụ bộ đếm giờ hiển thị thông báo của hệ điều hành chạy ở layer giao diện desktop, còn workflow nó gọi chạy ở backend) — miễn mọi lời gọi của nó đi qua điểm giao tiếp đã khai báo. Mọi thành phần hạ tầng cắt ngang đều được khai báo trong `clause_a_common.cross_cutting` của API Contract, tên của nó xuất hiện trong `called_by` của mọi điểm giao tiếp nó gọi tới, và mọi lối vào mà bên ngoài hệ thống gọi thẳng vào nó nằm trong `entries` của nó (xem [Giai đoạn 2](02-contract.md)). Nó có khối checkpoint riêng (xem [07-checkpoint-protocol.md](07-checkpoint-protocol.md)).

## Bước 5.6 — Thao tác cấp kho lưu trữ: sao lưu, khôi phục, di chuyển toàn bộ dữ liệu

Có một loại tác vụ nhìn qua tưởng vi phạm nguyên tắc sở hữu dữ liệu: sao chép toàn bộ một nơi lưu trữ ra một tệp sao lưu, thay thế nó bằng một bản sao lưu cũ, hay di chuyển nó sang vị trí khác. Những tác vụ này chạm vào dữ liệu của mọi workflow cùng lúc.

Câu hỏi phân định: tác vụ này có **đọc hay diễn giải** nội dung nghiệp vụ bên trong không, hay nó chỉ xử lý nơi lưu trữ như một khối vật lý nguyên vẹn?

- Nếu tác vụ chỉ xử lý nơi lưu trữ như một khối — sao chép nguyên khối, thay nguyên khối, kiểm tra tính toàn vẹn của khối — đây là **thao tác cấp kho lưu trữ**. Nó hợp lệ, với điều kiện đi qua tài nguyên do workflow nền tảng quản lý nơi lưu trữ đó cung cấp (ví dụ vị trí của nơi lưu trữ), không tự đi tìm.
- Nếu tác vụ cần đọc từng bản ghi nghiệp vụ, lọc theo ý nghĩa, hay chuyển đổi dữ liệu của một workflow cụ thể, nó không còn là thao tác cấp kho lưu trữ — nó phải lấy dữ liệu qua điểm giao tiếp của từng workflow sở hữu, như mọi bên tiêu thụ khác.

Thao tác thay thế toàn bộ nơi lưu trữ đang được các workflow sử dụng còn đụng tới vòng đời của layer (phải dừng những gì đang dùng nơi lưu trữ đó trước khi thay). Việc dừng và khởi động lại là của Main; workflow thực hiện thao tác chỉ dùng công cụ quản lý vòng đời mà Main trao cho nó, không tự dừng hay khởi động tiến trình. Trong hợp đồng, công cụ đó là một input `from: main` của workflow (xem [Giai đoạn 2](02-contract.md)); việc chờ layer vừa khởi động lại sẵn sàng dùng đúng tín hiệu sẵn sàng giữa các Main, không qua điểm giao tiếp nào.

**Checklist:**

- [ ] Đã tự hỏi liệu đoạn xử lý trùng lặp này có chắc chắn sẽ luôn giống nhau trong tương lai, hay chỉ đang tình cờ giống nhau ở hiện tại.
- [ ] Đã xác định đúng ranh giới của sự trùng lặp là nội bộ một workflow hay giữa nhiều workflow, trước khi áp dụng bất kỳ quy tắc nào.
- [ ] Nếu quyết định đặt một đoạn xử lý vào vị trí dùng chung, đã xác nhận CẢ HAI điều kiện ở Bước 5.3 cùng đúng — không chỉ một trong hai.
- [ ] Nếu xác nhận một tác vụ cần đứng ngoài cấu trúc workflow, đã phân định rõ workflow nào khởi kích và tác vụ đó thực sự thuộc trách nhiệm của ai.
- [ ] Thành phần hạ tầng cắt ngang chỉ quyết định khi nào gọi và chuyển kết quả đi đâu, không chứa quyết định nghiệp vụ nào; nó đã được khai báo trong `cross_cutting` và có tên trong `called_by` của mọi điểm giao tiếp nó gọi.
- [ ] Nếu có đoạn xử lý được đặt vào vị trí dùng chung, vị trí đó nằm trong đúng một layer, không nằm trong thư mục của workflow nào.
- [ ] Nếu có thao tác cấp kho lưu trữ, đã xác nhận nó không đọc hay diễn giải nội dung nghiệp vụ, và nó đi qua tài nguyên do workflow nền tảng quản lý nơi lưu trữ cung cấp; nếu nó cần dừng hay khởi động lại một layer, nó dùng công cụ `from: main`.
- [ ] Nếu bên ngoài hệ thống gọi thẳng vào một thành phần hạ tầng cắt ngang, đã xác nhận việc đó chỉ là trình bày, và lối vào đã được khai báo trong `entries`.
- [ ] **Đã xác nhận hạ tầng cắt ngang không đi tắt vào phần nội bộ (Entities, Adapters, Services) của bất kỳ workflow nào để lấy dữ liệu — kể cả khi dữ liệu đó nằm chung cơ sở dữ liệu với dữ liệu khác. Nếu dữ liệu có chủ sở hữu là một workflow cụ thể, đã xác nhận có một điểm giao tiếp chính thức được workflow đó công bố để cung cấp dữ liệu, và hạ tầng cắt ngang đi qua đúng điểm đó.**

⚠ Sau khi hoàn thành giai đoạn này, quay lại đúng vị trí đang dừng (thường là [Giai đoạn 4](04-implement.md)), tiếp tục với quyết định vừa đưa ra. Nếu quyết định làm thay đổi hình dạng hợp đồng (thêm điểm giao tiếp, thêm thành phần cắt ngang), cập nhật hợp đồng ở [Giai đoạn 2](02-contract.md) trước khi viết code phản ánh quyết định đó.

---

## Minh họa — áp dụng vào hệ thống đặt lịch hẹn

⚠ Lưu ý trước khi đọc phần này: tình huống dưới đây chỉ minh họa cho Bước 5.4 và 5.5 (xử lý bất đồng bộ), vì bài toán đặt lịch hẹn nhỏ này không có tình huống nào thực sự cần minh họa cho Bước 5.1 đến 5.3 (logic dùng chung giữa nhiều workflow) hay Bước 5.6 (thao tác cấp kho lưu trữ) một cách tự nhiên — điều đó không có nghĩa nhóm bước đó kém quan trọng hơn, chỉ đơn giản là bài toán này không rơi vào tình huống đó.

Ngay từ Giai đoạn 1 (Bước 1.5) đã ghi nhận: việc gửi tin nhắn nhắc nhở cần được kích hoạt tự động vào một thời điểm trước giờ hẹn, không phải ngay khi người dùng đặt lịch. Vì ai khởi kích việc này quyết định điểm giao tiếp nào phải có trong hợp đồng, tình huống được giải quyết ở đây trước khi soạn hợp đồng ở Giai đoạn 2.

**Bước 5.4:** Tự hỏi — việc gửi tin nhắn này có cần hoàn thành ngay trong lượt xử lý của `book_appointment` không? Không — nó xảy ra ở một thời điểm hoàn toàn khác, có thể nhiều giờ hoặc nhiều ngày sau. Xác nhận: đây là một tác vụ không khớp mô hình tiếp nhận-xử lý-trả kết quả ngay.

**Bước 5.5:** Workflow nào khởi kích việc kiểm tra "đã tới lúc gửi nhắc nhở chưa"? Đây không phải `book_appointment` chủ động gọi — mà là một cơ chế kiểm tra định kỳ, đứng ngoài cả hai workflow `book_appointment` lẫn `send_reminder`, định kỳ chạy một lượt quét: lấy các lịch hẹn sắp tới rồi giao cho `send_reminder`, để chính `send_reminder` quyết định lịch hẹn nào đã tới lúc cần nhắc.

Tiếp tục áp dụng ràng buộc "không đi tắt": danh sách lịch hẹn sắp tới là output do chính `book_appointment` sở hữu (đã cam kết trong `output_guaranteed.appointment` ở Giai đoạn 2), không phải dữ liệu hạ tầng chung — dù về mặt vật lý nó nằm trong cùng một cơ sở dữ liệu mà `scaffold` đã khởi tạo kết nối tới. Vì vậy, cơ chế quét định kỳ không được phép tự đọc thẳng cơ sở dữ liệu — nó phải lấy dữ liệu qua đúng điểm giao tiếp mà `book_appointment` công bố.

**Kết quả áp dụng:** Tạo một thành phần hạ tầng cắt ngang `background_jobs`, đặt ngoài thư mục của mọi workflow (`backend/cross_cutting/background_jobs/`), khai báo trong `clause_a_common.cross_cutting` của API Contract, chạy định kỳ, thực hiện đúng hai lượt gọi, cả hai đều qua Routers, không lượt nào đi tắt:

1. Gọi vào điểm giao tiếp `list_upcoming` mà `book_appointment` đã công bố trong hợp đồng (xem Giai đoạn 2) để lấy danh sách lịch hẹn sắp tới — không tự ý đọc thẳng bảng dữ liệu trong cơ sở dữ liệu, dù kỹ thuật hoàn toàn cho phép làm vậy.
2. Chuyển nguyên danh sách đó vào điểm giao tiếp `send_for_upcoming` của `send_reminder` — dưới hình thức một hàm được gọi trực tiếp, không phải một điểm giao tiếp qua mạng — để Routers chuyển giao cho Services. Việc quyết định lịch hẹn nào đã tới lúc cần nhắc là một quyết định nghiệp vụ, nên nằm trong Services của `send_reminder`, không nằm trong `background_jobs`: `background_jobs` chỉ quyết định *khi nào* chạy một lượt quét, không quyết định *lịch hẹn nào* được nhắc.

Dù `background_jobs` là hạ tầng cắt ngang, không phải một workflow, nó vẫn phải tuân theo đúng nguyên tắc "Routers là điểm nhận kích hoạt hợp lệ duy nhất" ở cả hai đầu: đầu lấy dữ liệu (qua `book_appointment`) và đầu kích hoạt xử lý (qua `send_reminder`). Không có lượt gọi nào được miễn trừ chỉ vì `background_jobs` không phải một workflow chính thức, hay vì dữ liệu cùng nằm chung một hạ tầng lưu trữ.